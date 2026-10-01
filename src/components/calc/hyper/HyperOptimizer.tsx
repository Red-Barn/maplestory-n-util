"use client";

import { useEffect, useMemo, useState } from "react";
import CritReinforceCard, { DEFAULT_CRIT_REINFORCE, type CritReinforceSettings } from "./CritReinforceCard";
import { HYPER_MAX_LEVEL } from "@/data/hyperStats";
import {
  apiSpentPoints,
  cumulativeCost,
  inputFromLevels,
  levelsFromInput,
  spentPoints,
  type HyperLevels,
} from "@/lib/calc/hyper/cost";
import { cdmgPerCrit, hasCritReinforce } from "@/lib/calc/hyper/critReinforce";
import { hyperFinal, optimizeHyper, termsOf } from "@/lib/calc/hyper/optimize";
import { load, save } from "@/lib/client/storage";
import { useCharacterStats, useWornBundle } from "@/lib/client/useCharacterStats";
import {
  API_PRESET,
  damageScore,
  effectsForJob,
  PRESET_SLOTS,
  STAT_LABEL,
  type ChoiceDef,
  type DamageTerms,
  type JobView,
} from "@/lib/stats";
import type { CharacterBundle } from "@/types/msu";

const TERMS: { key: keyof DamageTerms; label: string; digits: number }[] = [
  { key: "stat", label: "스탯 반영치", digits: 2 },
  { key: "attack", label: "총 공격력/마력", digits: 0 },
  { key: "damage", label: "데미지% 총합", digits: 2 },
  { key: "defense", label: "방어율 보정", digits: 4 },
  { key: "crit", label: "평균 크리티컬 보정", digits: 4 },
];

const num = (v: number, digits = 0) =>
  v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** "+1.23%" change from `before` to `after`; "–" when there is nothing to compare against. */
const gain = (before: number, after: number) => {
  if (!(before > 0)) return "–";
  const pct = (after / before - 1) * 100;
  return Math.abs(pct) < 0.005 ? "–" : `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;
};
const tone = (delta: number) => (delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-zinc-400");

/** "+90", "+21%" — what the stat gives at `level`, as the job sees it. */
function effectAt(def: ChoiceDef, level: number, job: JobView): string {
  const effects = effectsForJob(def.options[Math.max(level, 1) - 1].effects, job);
  const pct = effects[0]?.key.endsWith("%") ? "%" : "";
  return `+${level > 0 ? (effects[0]?.value ?? 0) : 0}${pct}`;
}

/** "공격력/마력" is shown as the job's own attack type. */
const statName = (def: ChoiceDef, job: JobView) =>
  def.id === "attackAndMagicAttack" ? STAT_LABEL[job.attackType] : def.name;

const th = "px-3 py-2 font-medium";
const td = "px-3 py-1.5 tabular-nums";
const card = "overflow-x-auto rounded-lg border border-black/10 dark:border-white/15";
const head = "bg-black/[.03] text-xs text-zinc-500 dark:bg-white/[.04]";
const row = "border-t border-black/5 dark:border-white/10";

/** Finds the hyper stat levels with the highest damage score for the points the character has. */
export default function HyperOptimizer({ bundle }: { bundle: CharacterBundle }) {
  const { character } = bundle;
  const { worn } = useWornBundle(bundle);
  const { base, hyperDefs, hyperInput, hyperPreset, hyperPresets, setHyperPresets, persist, withoutHyper, result } =
    useCharacterStats(worn);
  const job = base.job;

  const apiPoints = useMemo(() => apiSpentPoints(character), [character]);
  // unset = the points the API preset uses
  const [entered, setEntered] = useState<number>();
  const [saved, setSaved] = useState<string>();
  const maxPoints = hyperDefs.length * cumulativeCost(HYPER_MAX_LEVEL);
  const budget = Math.max(0, Math.min(Math.floor(entered ?? apiPoints), maxPoints));

  // Critical Reinforce (Bowman jobs), saved per character
  const reinforceKey = `msn:hyper-crit-reinforce:${character.assetKey}`;
  const canReinforce = hasCritReinforce(character.common.job.className);
  const [reinforce, setReinforce] = useState<CritReinforceSettings>(DEFAULT_CRIT_REINFORCE);
  useEffect(() => {
    // localStorage is only readable after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReinforce({ ...DEFAULT_CRIT_REINFORCE, ...load<Partial<CritReinforceSettings>>(reinforceKey, {}) });
  }, [reinforceKey]);
  const changeReinforce = (next: CritReinforceSettings) => {
    setReinforce(next);
    save(reinforceKey, next);
  };
  const perCrit = canReinforce && reinforce.on ? cdmgPerCrit(reinforce) : undefined;

  const current: HyperLevels = useMemo(() => levelsFromInput(hyperInput), [hyperInput]);
  const ctx = useMemo(
    () => job && { base: withoutHyper, ap: base.ap, job, cdmgPerCrit: perCrit },
    [withoutHyper, base.ap, job, perCrit],
  );
  const plan = useMemo(() => ctx && optimizeHyper(ctx, budget), [ctx, budget]);

  if (!job || !ctx || !plan) {
    return (
      <p className="text-sm text-zinc-500">
        {character.common.job.jobName} 직업 데이터가 아직 없어 하이퍼 스탯을 계산할 수 없습니다.
      </p>
    );
  }

  // both sides with the same Critical Reinforce average
  const before = termsOf(result.final, job, perCrit);
  const afterFinal = hyperFinal(ctx, plan.levels);
  const after = termsOf(afterFinal, job, perCrit);
  const currentPoints = spentPoints(Object.fromEntries(hyperDefs.map((d) => [d.id, current[d.id] ?? 0])));
  const presetName = hyperPreset === API_PRESET ? "API 프리셋" : `프리셋 ${hyperPreset}`;

  const saveTo = (slot: string) => {
    const all = { ...hyperPresets, [slot]: inputFromLevels({ ...plan.levels }) };
    setHyperPresets(all);
    persist({ hyperPresets: all });
    setSaved(slot);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <label className="space-y-1 text-sm">
          <span className="block text-xs text-zinc-500">사용 가능 포인트</span>
          <input
            type="number"
            min={0}
            max={maxPoints}
            value={budget}
            onChange={(e) => {
              setEntered(e.target.value === "" ? 0 : Number(e.target.value));
              setSaved(undefined);
            }}
            className="w-28 rounded border border-black/15 bg-transparent px-2 py-1 text-right tabular-nums dark:border-white/20"
          />
        </label>
        <div className="text-sm">
          <span className="block text-xs text-zinc-500">데미지 점수 ({presetName} 대비)</span>
          <span className={`text-lg font-semibold tabular-nums ${tone(plan.score - damageScore(before))}`}>
            {gain(damageScore(before), plan.score)}
          </span>
        </div>
        <div className="text-sm">
          <span className="block text-xs text-zinc-500">사용 / 남는 포인트</span>
          <span className="tabular-nums">
            {num(plan.used)} / {num(budget - plan.used)}
          </span>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        기본값은 API 프리셋에 쓴 포인트 전체({num(apiPoints)})입니다. 경험치·일반 몬스터 데미지처럼 데미지 점수와
        무관한 스탯에 쓴 포인트도 포함하므로, 그 스탯을 유지하려면 포인트를 줄여 입력하세요. 비교 기준인 {presetName}
        은 데미지 관련 스탯에 {num(currentPoints)}포인트를 쓰고 있습니다.
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className={card}>
          <table className="w-full text-sm">
            <thead className={head}>
              <tr>
                <th className={`${th} text-left`}>하이퍼 스탯</th>
                <th className={`${th} text-right`}>현재</th>
                <th className={`${th} text-right`}>최적</th>
                <th className={`${th} text-right`}>수치</th>
                <th className={`${th} text-right`}>포인트</th>
              </tr>
            </thead>
            <tbody>
              {hyperDefs.map((def) => {
                const from = current[def.id] ?? 0;
                const to = plan.levels[def.id] ?? 0;
                return (
                  <tr key={def.id} className={row}>
                    <td className="px-3 py-1.5">{statName(def, job)}</td>
                    <td className={`${td} text-right text-zinc-500`}>Lv.{from}</td>
                    <td className={`${td} text-right font-medium ${to === from ? "" : tone(to - from)}`}>Lv.{to}</td>
                    <td className={`${td} text-right`}>
                      {from === to ? effectAt(def, to, job) : `${effectAt(def, from, job)} → ${effectAt(def, to, job)}`}
                    </td>
                    <td className={`${td} text-right`}>{num(cumulativeCost(to))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          {canReinforce && (
            <CritReinforceCard
              settings={reinforce}
              onChange={changeReinforce}
              perCrit={perCrit}
              critBefore={result.final["CRIT%"]}
              critAfter={afterFinal["CRIT%"]}
            />
          )}
          <div className={card}>
            <table className="w-full text-sm">
              <thead className={head}>
                <tr>
                  <th className={`${th} text-left`}>데미지 항</th>
                  <th className={`${th} text-right`}>현재</th>
                  <th className={`${th} text-right`}>최적</th>
                  <th className={`${th} text-right`}>변화</th>
                </tr>
              </thead>
              <tbody>
                {TERMS.map(({ key, label, digits }) => (
                  <tr key={key} className={row}>
                    <td className="px-3 py-1.5">{label}</td>
                    <td className={`${td} text-right text-zinc-500`}>{num(before[key], digits)}</td>
                    <td className={`${td} text-right`}>{num(after[key], digits)}</td>
                    <td className={`${td} text-right ${tone(after[key] - before[key])}`}>{gain(before[key], after[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {PRESET_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => saveTo(slot)}
                  className="rounded border border-black/15 px-3 py-1 text-sm hover:bg-black/[.03] dark:border-white/20 dark:hover:bg-white/[.04]"
                >
                  프리셋 {slot}에 저장
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              {saved
                ? `프리셋 ${saved}에 저장했습니다. 캐릭터 탭의 스탯 패널 "프리셋"에서 선택하면 스탯 표에 반영됩니다.`
                : "최적 배분을 스탯 패널의 하이퍼 스탯 프리셋 1~3에 저장합니다. 그 칸에 입력해 둔 값은 덮어씁니다."}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        데미지 점수는 다섯 항의 곱이며 몬스터 방어율 300% 기준입니다. 스탯 패널에서 고른 버프·링크·유니온·어빌리티
        프리셋이 모두 반영됩니다. 레벨별 포인트 비용은 본섭 표를 적용했습니다(인게임 확인 필요).
      </p>
    </div>
  );
}
