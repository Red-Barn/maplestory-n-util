"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { load, pushRecent, save } from "@/lib/client/storage";
import {
  apStatToFinal,
  calibrate,
  collectCharacter,
  computeStats,
  type FinalStats,
  type StatContribution,
  type StatKey,
} from "@/lib/stats";
import type { CharacterBundle } from "@/types/msu";

const ROWS: { key: keyof FinalStats; label: string; pct?: boolean; parts: StatKey[] }[] = [
  { key: "STR", label: "STR", parts: ["STR", "STR%", "ALL%", "STR_FIXED", "AP%"] },
  { key: "DEX", label: "DEX", parts: ["DEX", "DEX%", "ALL%", "DEX_FIXED", "AP%"] },
  { key: "INT", label: "INT", parts: ["INT", "INT%", "ALL%", "INT_FIXED", "AP%"] },
  { key: "LUK", label: "LUK", parts: ["LUK", "LUK%", "ALL%", "LUK_FIXED", "AP%"] },
  { key: "ATT", label: "공격력", parts: ["ATT", "ATT%"] },
  { key: "MATT", label: "마력", parts: ["MATT", "MATT%"] },
  { key: "DMG%", label: "데미지", pct: true, parts: ["DMG%"] },
  { key: "BOSS%", label: "보스 데미지", pct: true, parts: ["BOSS%"] },
  { key: "NORMAL%", label: "일반 몬스터 데미지", pct: true, parts: ["NORMAL%"] },
  { key: "IED%", label: "방어율 무시", pct: true, parts: ["IED%"] },
  { key: "CRIT%", label: "크리티컬 확률", pct: true, parts: ["CRIT%"] },
  { key: "CDMG%", label: "크리티컬 데미지", pct: true, parts: ["CDMG%"] },
  { key: "FD%", label: "최종 데미지", pct: true, parts: ["FD%"] },
];

const SOURCE_NAMES: Record<StatContribution["source"], string> = {
  base: "기본",
  "equip-base": "장비 기본",
  starforce: "스타포스/강화",
  flame: "추가옵션",
  set: "세트 효과",
  potential: "잠재능력",
  "bonus-potential": "에디셔널",
  arcane: "아케인 심볼",
  hyper: "하이퍼 스탯",
  ability: "어빌리티",
  skill: "패시브 스킬",
  "job-buff": "버프",
  consumable: "소비 버프",
  synergy: "시너지",
  custom: "사용자 입력",
  calibration: "API 미제공 보정",
};

const fmt = (n: number, pct?: boolean) =>
  pct ? `${Math.round(n * 100) / 100}%` : Math.round(n).toLocaleString();
const signed = (n: number, pct?: boolean) => (n > 0 ? "+" : "") + fmt(n, pct);

export default function StatPanel({ bundle }: { bundle: CharacterBundle }) {
  const { character } = bundle;
  const storageKey = `msn:stat-panel:${character.assetKey}`;

  const base = useMemo(() => collectCharacter(bundle), [bundle]);
  const inGame = useMemo(() => apStatToFinal(character.apStat), [character.apStat]);
  const defaults = useMemo(() => Object.fromEntries(base.buffs.map((b) => [b.id, b.defaultOn])), [base.buffs]);

  const [buffs, setBuffs] = useState<Record<string, boolean>>(defaults);
  const [useCalibration, setUseCalibration] = useState(true);
  const [open, setOpen] = useState<keyof FinalStats>();

  useEffect(() => {
    // restore per-character toggles and record this visit (localStorage is client-only)
    const saved = load<{ buffs?: Record<string, boolean>; calibration?: boolean }>(storageKey, {});
    /* eslint-disable react-hooks/set-state-in-effect */
    if (saved.buffs) setBuffs({ ...defaults, ...saved.buffs });
    if (saved.calibration !== undefined) setUseCalibration(saved.calibration);
    /* eslint-enable react-hooks/set-state-in-effect */
    pushRecent({
      assetKey: character.assetKey,
      name: character.common.name,
      jobName: character.common.job.jobName,
      level: character.common.level,
      imageUrl: character.image.imageUrl,
    });
  }, [storageKey, defaults, character]);

  const persist = (next: { buffs?: Record<string, boolean>; calibration?: boolean }) =>
    save(storageKey, { buffs, calibration: useCalibration, ...next });

  // The in-game snapshot is taken with the default buff set; calibrate against that baseline.
  const baseline = useMemo(
    () => [...base.permanent, ...base.buffs.filter((b) => b.defaultOn).flatMap((b) => b.contributions)],
    [base],
  );
  const calibration = useMemo(() => calibrate(baseline, base.ap, inGame), [baseline, base.ap, inGame]);

  const active = useMemo(() => {
    const on = base.buffs.filter((b) => buffs[b.id]).flatMap((b) => b.contributions);
    return [...base.permanent, ...on, ...(useCalibration ? calibration : [])];
  }, [base, buffs, useCalibration, calibration]);

  const result = useMemo(() => computeStats(active, base.ap), [active, base.ap]);
  const reference = useMemo(
    () => computeStats([...baseline, ...(useCalibration ? calibration : [])], base.ap),
    [baseline, useCalibration, calibration, base.ap],
  );

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_240px]">
      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-sm">
          <thead className="bg-black/[.03] text-xs text-zinc-500 dark:bg-white/[.04]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">스탯</th>
              <th className="px-3 py-2 text-right font-medium">계산값</th>
              <th className="px-3 py-2 text-right font-medium">버프 변화</th>
              <th className="px-3 py-2 text-right font-medium">인게임(API)</th>
              {!useCalibration && <th className="px-3 py-2 text-right font-medium">오차</th>}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const v = result.final[row.key];
              const delta = v - reference.final[row.key];
              const err = v - inGame[row.key];
              return (
                <Fragment key={row.key}>
                  <tr
                    onClick={() => setOpen(open === row.key ? undefined : row.key)}
                    className={`cursor-pointer border-t border-black/5 hover:bg-black/[.03] dark:border-white/10 dark:hover:bg-white/[.04] ${open === row.key ? "bg-black/[.03] dark:bg-white/[.04]" : ""}`}
                  >
                  <td className="px-3 py-1.5">{row.label}</td>
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">{fmt(v, row.pct)}</td>
                  <td
                    className={`px-3 py-1.5 text-right tabular-nums ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-zinc-400"}`}
                  >
                    {Math.abs(delta) < 0.005 ? "–" : signed(delta, row.pct)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">{fmt(inGame[row.key], row.pct)}</td>
                  {!useCalibration && (
                    <td className={`px-3 py-1.5 text-right tabular-nums ${Math.abs(err) < 0.005 ? "text-zinc-400" : "text-amber-600"}`}>
                      {Math.abs(err) < 0.005 ? "0" : signed(err, row.pct)}
                    </td>
                  )}
                  </tr>
                  {open === row.key && (
                    <Breakdown
                      colSpan={useCalibration ? 4 : 5}
                      contributions={result.contributions.filter((c) => row.parts.includes(c.stat))}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-zinc-500">
          행을 누르면 출처별 내역이 보입니다. AP는 레벨 기준 자동 분배로 추정합니다 (주스탯 {base.ap[base.job?.mainStat ?? "STR"]}).
        </p>
      </div>

      <aside className="space-y-4">
        <section className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <h3 className="mb-2 text-sm font-semibold">버프</h3>
          {base.buffs.length === 0 && (
            <p className="text-xs text-zinc-500">
              {base.job ? "배운 버프 스킬이 없습니다." : `${character.common.job.jobName} 직업 데이터가 아직 없습니다.`}
            </p>
          )}
          <ul className="space-y-1">
            {base.buffs.map((b) => (
              <li key={b.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!buffs[b.id]}
                    onChange={(e) => {
                      const next = { ...buffs, [b.id]: e.target.checked };
                      setBuffs(next);
                      persist({ buffs: next });
                    }}
                  />
                  <span>
                    {b.name}
                    <span className="block text-[11px] text-zinc-500">
                      {b.contributions.map((c) => `${c.stat} +${c.value}`).join(", ")}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={useCalibration}
              onChange={(e) => {
                setUseCalibration(e.target.checked);
                persist({ calibration: e.target.checked });
              }}
            />
            <span>
              API 미제공 스탯 보정
              <span className="block text-[11px] text-zinc-500">
                유니온·링크·길드·칭호 등 API에 없는 스탯을 인게임 값과의 차이로 채웁니다. 끄면 계산 오차가 보입니다.
              </span>
            </span>
          </label>
        </section>
      </aside>
    </div>
  );
}

function Breakdown({ contributions, colSpan }: { contributions: StatContribution[]; colSpan: number }) {
  const bySource = new Map<string, StatContribution[]>();
  for (const c of contributions) bySource.set(c.source, [...(bySource.get(c.source) ?? []), c]);
  return (
    <tr>
      <td colSpan={colSpan} className="bg-black/[.02] px-3 py-2 dark:bg-white/[.03]">
        {contributions.length === 0 ? (
          <p className="text-xs text-zinc-500">내역 없음</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...bySource].map(([source, list]) => (
              <div key={source}>
                <p className="text-xs font-semibold">{SOURCE_NAMES[source as StatContribution["source"]]}</p>
                <ul className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {list.map((c, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{c.label}</span>
                      <span className="shrink-0 tabular-nums">
                        {c.stat} {c.value > 0 ? "+" : ""}
                        {Math.round(c.value * 100) / 100}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}
