"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { JobData } from "@/data/jobs";
import { load, pushRecent, save } from "@/lib/client/storage";
import {
  apStatToFinal,
  collectCharacter,
  collectCollection,
  collectUnion,
  computeStats,
  MAIN_STATS,
  type CollectionInput,
  type ComputedStats,
  type FinalStats,
  type MainStat,
  type StatContribution,
  type StatKey,
  type UnionInput,
} from "@/lib/stats";
import type { CharacterBundle } from "@/types/msu";

type Row = {
  id: string;
  label: string;
  /** small text under the label, e.g. how a % total is made up */
  note?: (r: ComputedStats) => string;
  pct?: boolean;
  parts: StatKey[];
  value: (r: ComputedStats) => number;
  /** in-game stat window value, when the API has one */
  inGame?: keyof FinalStats;
};

const final = (key: keyof FinalStats, label: string, parts: StatKey[], pct?: boolean): Row => ({
  id: key,
  label,
  pct,
  parts,
  value: (r) => r.final[key],
  inGame: key,
});

const mainStatRow = (s: MainStat, role?: string) =>
  final(s, role ? `${s} (${role})` : s, [s, `${s}%`, "ALL%", `${s}_FIXED`, "AP%"]);

const n = (r: ComputedStats, k: StatKey) => Math.round((r.totals[k] ?? 0) * 100) / 100;

// Stat % rows count 올스탯% in, since it applies the same way.
const statPctRow = (s: MainStat, role?: string): Row => ({
  id: `${s}%`,
  label: role ? `${role} % (${s})` : `${s} %`,
  note: (r) => `${s}% ${n(r, `${s}%`)} + 올스탯% ${n(r, "ALL%")}`,
  pct: true,
  parts: [`${s}%`, "ALL%"],
  value: (r) => (r.totals[`${s}%`] ?? 0) + (r.totals["ALL%"] ?? 0),
});

const attPctRow = (key: "ATT%" | "MATT%"): Row => ({
  id: key,
  label: key === "ATT%" ? "공격력 %" : "마력 %",
  pct: true,
  parts: [key],
  value: (r) => r.totals[key] ?? 0,
});

// With job data only the job's main/sub stats and attack type are shown.
function buildRows(job: JobData | undefined): Row[] {
  const statRows = job
    ? [mainStatRow(job.mainStat, "주스탯"), ...job.subStats.map((s) => mainStatRow(s, "부스탯"))]
    : MAIN_STATS.map((s) => mainStatRow(s));
  const pctRows = job
    ? [statPctRow(job.mainStat, "주스탯"), ...job.subStats.map((s) => statPctRow(s, "부스탯")), attPctRow(`${job.attackType}%`)]
    : [...MAIN_STATS.map((s) => statPctRow(s)), attPctRow("ATT%"), attPctRow("MATT%")];
  const attRows = [final("ATT", "공격력", ["ATT", "ATT%"]), final("MATT", "마력", ["MATT", "MATT%"])].filter(
    (r) => !job || r.id === job.attackType,
  );
  return [
    ...statRows,
    ...pctRows,
    ...attRows,
    final("DMG%", "데미지", ["DMG%"], true),
    final("BOSS%", "보스 데미지", ["BOSS%"], true),
    final("IED%", "방어율 무시", ["IED%"], true),
    final("CRIT%", "크리티컬 확률", ["CRIT%"], true),
    final("CDMG%", "크리티컬 데미지", ["CDMG%"], true),
    final("FD%", "최종 데미지", ["FD%"], true),
  ];
}

type Field<K extends string> = { key: K; label: string; pct?: boolean };

function collectionFields(job: JobData | undefined): Field<keyof CollectionInput>[] {
  const stats: Field<keyof CollectionInput>[] = job
    ? [{ key: job.mainStat, label: `주스탯 (${job.mainStat})` }, ...job.subStats.map((s) => ({ key: s, label: `부스탯 (${s})` }))]
    : MAIN_STATS.map((s) => ({ key: s, label: s }));
  return [
    { key: "ALL", label: "올스탯" },
    ...stats,
    { key: "ATT", label: !job ? "공격력/마력" : job.attackType === "ATT" ? "공격력" : "마력" },
    { key: "DMG%", label: "데미지", pct: true },
    { key: "BOSS%", label: "보스 데미지", pct: true },
    { key: "IED%", label: "방어율 무시", pct: true },
    { key: "CRIT%", label: "크리티컬 확률", pct: true },
    { key: "CDMG%", label: "크리티컬 데미지", pct: true },
  ];
}

function unionFields(job: JobData | undefined): Field<MainStat>[] {
  return job
    ? [{ key: job.mainStat, label: `주스탯 (${job.mainStat})` }, ...job.subStats.map((s) => ({ key: s, label: `부스탯 (${s})` }))]
    : MAIN_STATS.map((s) => ({ key: s, label: s }));
}

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
  union: "유니온",
  collection: "도감",
  custom: "사용자 입력",
};

const fmt = (v: number, pct?: boolean) =>
  pct ? `${Math.round(v * 100) / 100}%` : Math.round(v).toLocaleString();
const signed = (v: number, pct?: boolean) => (v > 0 ? "+" : "") + fmt(v, pct);

type Saved = { buffs?: Record<string, boolean>; union?: UnionInput; collection?: CollectionInput };

export default function StatPanel({ bundle }: { bundle: CharacterBundle }) {
  const { character } = bundle;
  const storageKey = `msn:stat-panel:${character.assetKey}`;

  const base = useMemo(() => collectCharacter(bundle), [bundle]);
  const rows = useMemo(() => buildRows(base.job), [base.job]);
  const inGame = useMemo(() => apStatToFinal(character.apStat), [character.apStat]);
  const defaults = useMemo(() => Object.fromEntries(base.buffs.map((b) => [b.id, b.defaultOn])), [base.buffs]);

  const [buffs, setBuffs] = useState<Record<string, boolean>>(defaults);
  const [union, setUnion] = useState<UnionInput>({});
  const [collection, setCollection] = useState<CollectionInput>({});
  const [open, setOpen] = useState<string>();

  useEffect(() => {
    // restore per-character settings and record this visit (localStorage is client-only)
    const saved = load<Saved>(storageKey, {});
    /* eslint-disable react-hooks/set-state-in-effect */
    if (saved.buffs) setBuffs({ ...defaults, ...saved.buffs });
    if (saved.union) setUnion(saved.union);
    if (saved.collection) setCollection(saved.collection);
    /* eslint-enable react-hooks/set-state-in-effect */
    pushRecent({
      assetKey: character.assetKey,
      name: character.common.name,
      jobName: character.common.job.jobName,
      level: character.common.level,
      imageUrl: character.image.imageUrl,
    });
  }, [storageKey, defaults, character]);

  const persist = (next: Saved) => save(storageKey, { buffs, union, collection, ...next });

  // Stats the API doesn't break down, typed in by the user.
  const known = useMemo(
    () => [...base.permanent, ...collectUnion(union), ...collectCollection(collection)],
    [base.permanent, union, collection],
  );

  // Default buff set = what the API snapshot includes (season buff on, skill buffs off).
  // "버프 변화" is measured against it.
  const baseline = useMemo(
    () => [...known, ...base.buffs.filter((b) => b.defaultOn).flatMap((b) => b.contributions)],
    [known, base.buffs],
  );
  const active = useMemo(
    () => [...known, ...base.buffs.filter((b) => buffs[b.id]).flatMap((b) => b.contributions)],
    [known, base.buffs, buffs],
  );

  const result = useMemo(() => computeStats(active, base.ap), [active, base.ap]);
  const reference = useMemo(() => computeStats(baseline, base.ap), [baseline, base.ap]);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-sm">
          <thead className="bg-black/[.03] text-xs text-zinc-500 dark:bg-white/[.04]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">스탯</th>
              <th className="px-3 py-2 text-right font-medium">계산값</th>
              <th className="px-3 py-2 text-right font-medium">버프 변화</th>
              <th className="px-3 py-2 text-right font-medium">인게임(API)</th>
              <th className="px-3 py-2 text-right font-medium">오차</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const v = row.value(result);
              const delta = v - row.value(reference);
              const game = row.inGame && inGame[row.inGame];
              // compare the API snapshot with the matching (default buff) state
              const err = game === undefined ? undefined : row.value(reference) - game;
              return (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => setOpen(open === row.id ? undefined : row.id)}
                    className={`cursor-pointer border-t border-black/5 hover:bg-black/[.03] dark:border-white/10 dark:hover:bg-white/[.04] ${open === row.id ? "bg-black/[.03] dark:bg-white/[.04]" : ""}`}
                  >
                    <td className="px-3 py-1.5">
                      {row.label}
                      {row.note && <span className="block text-[11px] text-zinc-500">{row.note(result)}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">{fmt(v, row.pct)}</td>
                    <td
                      className={`px-3 py-1.5 text-right tabular-nums ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-zinc-400"}`}
                    >
                      {Math.abs(delta) < 0.005 ? "–" : signed(delta, row.pct)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">
                      {game === undefined ? "–" : fmt(game, row.pct)}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right tabular-nums ${err === undefined || Math.abs(err) < 0.005 ? "text-zinc-400" : "text-amber-600"}`}
                    >
                      {err === undefined ? "–" : Math.abs(err) < 0.005 ? "0" : signed(err, row.pct)}
                    </td>
                  </tr>
                  {open === row.id && (
                    <Breakdown colSpan={5} contributions={result.contributions.filter((c) => row.parts.includes(c.stat))} />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-zinc-500">
          행을 누르면 출처별 내역이 보입니다. 오차는 기본 버프 상태(시즌 버프만 켬) 계산값 − 인게임 값입니다. AP는 레벨
          기준 자동 분배로 추정합니다 (주스탯 {base.ap[base.job?.mainStat ?? "STR"]}).
        </p>
      </div>

      <aside className="space-y-4">
        <section className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <h3 className="text-sm font-semibold">버프</h3>
          <p className="mb-2 text-[11px] text-zinc-500">
            시즌 버프는 API 스탯에 포함되어 기본으로 켜져 있습니다. 스킬 버프는 포함되지 않으므로 체크하면 더해집니다.
          </p>
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
                      {b.description ?? b.contributions.map((c) => `${c.stat} +${c.value}`).join(", ")}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <NumberFields
          title="도감"
          hint="인게임 도감 효과 합계를 입력하세요. API 스탯에 포함되어 있는 수치입니다."
          fields={collectionFields(base.job)}
          values={collection}
          onChange={(next) => {
            setCollection(next);
            persist({ collection: next });
          }}
        />

        <NumberFields
          title="유니온 공격대원"
          hint="공격대원 효과 스탯 합계를 입력하세요. 스탯%가 적용되지 않는 스탯으로 더합니다."
          fields={unionFields(base.job)}
          values={union}
          onChange={(next) => {
            setUnion(next);
            persist({ union: next });
          }}
        />
      </aside>
    </div>
  );
}

function NumberFields<K extends string>(props: {
  title: string;
  hint: string;
  fields: Field<K>[];
  values: Partial<Record<K, number>>;
  onChange: (next: Partial<Record<K, number>>) => void;
}) {
  return (
    <section className="rounded-lg border border-black/10 p-3 dark:border-white/15">
      <h3 className="text-sm font-semibold">{props.title}</h3>
      <p className="mb-2 text-[11px] text-zinc-500">{props.hint}</p>
      <div className="space-y-1.5">
        {props.fields.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-2 text-sm">
            <span>{f.label}</span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={f.pct ? "any" : 1}
                value={props.values[f.key] ?? ""}
                placeholder="0"
                onChange={(e) => {
                  const raw = Math.max(0, Number(e.target.value) || 0);
                  const v = f.pct ? raw : Math.floor(raw);
                  props.onChange({ ...props.values, [f.key]: v || undefined });
                }}
                className="w-20 rounded border border-black/15 bg-transparent px-2 py-1 text-right tabular-nums dark:border-white/20"
              />
              <span className="w-3 text-[11px] text-zinc-500">{f.pct ? "%" : ""}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
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
