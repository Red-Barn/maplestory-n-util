"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { JobData } from "@/data/jobs";
import { LINK_SKILLS } from "@/data/links";
import { COLLECTION } from "@/data/collection";
import { MISC_ITEMS, TITLES } from "@/data/miscItems";
import { load, pushRecent, save } from "@/lib/client/storage";
import {
  apStatToFinal,
  collectCharacter,
  collectChoices,
  collectPresets,
  collectUnion,
  collectUnionGrid,
  computeStats,
  defaultPresetInput,
  formatEffect,
  mergeEffects,
  MAIN_STATS,
  defaultChoiceInput,
  type ChoiceInput,
  type ComputedStats,
  type FinalStats,
  type PresetInput,
  type MainStat,
  type StatContribution,
  type StatKey,
  type UnionGridInput,
  type UnionGridKey,
  type UnionInput,
} from "@/lib/stats";
import type { CharacterBundle } from "@/types/msu";
import { CheckList, ChoiceList, FieldList, Hint, InputTabs, PresetList, SubHeading, type Field, type Tab } from "./StatInputs";

/** What the formulas need besides contributions. */
type Ctx = { ap: Record<MainStat, number> };

type Row = {
  id: string;
  label: string;
  /** small text under the label, e.g. the formula or how a value is made up */
  note?: (r: ComputedStats, ctx: Ctx) => string;
  pct?: boolean;
  parts: StatKey[];
  value: (r: ComputedStats, ctx: Ctx) => number;
  /** in-game stat window value, when the API has one */
  inGame?: keyof FinalStats;
};

type Section = { title: string; rows: Row[] };

const t = (r: ComputedStats, k: StatKey) => r.totals[k] ?? 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const apPart = (r: ComputedStats, ctx: Ctx, s: MainStat) => Math.floor(ctx.ap[s] * (1 + t(r, "AP%") / 100));

// ---- component stats (what the totals are built from) ----

const flatStatRow = (s: MainStat, role?: string): Row => ({
  id: `flat-${s}`,
  label: role ? `${role} (${s})` : s,
  note: (r, ctx) => `AP ${apPart(r, ctx, s).toLocaleString()} + 스탯 ${r2(t(r, s)).toLocaleString()}`,
  parts: [s, "AP%"],
  value: (r, ctx) => apPart(r, ctx, s) + t(r, s),
});

const fixedStatRow = (s: MainStat, role?: string): Row => ({
  id: `fixed-${s}`,
  label: `${role ? `${role} (${s})` : s} %미적용`,
  note: () => "하이퍼스탯·아케인·유니온 공격대원",
  parts: [`${s}_FIXED`],
  value: (r) => t(r, `${s}_FIXED`),
});

const pctRow = (key: StatKey, label: string, inGame?: keyof FinalStats): Row => ({
  id: key,
  label,
  pct: true,
  parts: [key],
  value: (r) => (inGame ? r.final[inGame] : t(r, key)),
  inGame,
});

const flatRow = (key: "ATT" | "MATT"): Row => ({
  id: `flat-${key}`,
  label: key === "ATT" ? "공격력" : "마력",
  parts: [key],
  value: (r) => t(r, key),
});

// ---- totals, compared with the API ----

const totalStatRow = (s: MainStat, role?: string): Row => ({
  id: s,
  label: `총 ${role ? `${role} (${s})` : s}`,
  note: () => `⌊(AP+${s}) × (1 + ${s}% + 올스탯%)⌋ + %미적용`,
  parts: [s, `${s}%`, "ALL%", `${s}_FIXED`, "AP%"],
  value: (r) => r.final[s],
  inGame: s,
});

const totalAttRow = (key: "ATT" | "MATT"): Row => ({
  id: key,
  label: key === "ATT" ? "총 공격력" : "총 마력",
  note: () => `⌊${key === "ATT" ? "공격력" : "마력"} × (1 + ${key === "ATT" ? "공격력" : "마력"}%)⌋`,
  parts: [key, `${key}%`],
  value: (r) => r.final[key],
  inGame: key,
});

function buildSections(job: JobData | undefined): Section[] {
  const stats: [MainStat, string | undefined][] = job
    ? [[job.mainStat, "주스탯"], ...job.subStats.map((s): [MainStat, string] => [s, "부스탯"])]
    : MAIN_STATS.map((s): [MainStat, undefined] => [s, undefined]);
  const atts: ("ATT" | "MATT")[] = job ? [job.attackType] : ["ATT", "MATT"];

  return [
    {
      title: "구성 스탯",
      rows: [
        ...stats.map(([s, role]) => flatStatRow(s, role)),
        ...stats.map(([s, role]) => fixedStatRow(s, role)),
        ...atts.map(flatRow),
        ...stats.map(([s, role]) => pctRow(`${s}%`, role ? `${role} % (${s})` : `${s} %`)),
        pctRow("ALL%", "올스탯 %"),
        ...atts.map((a) => pctRow(`${a}%`, a === "ATT" ? "공격력 %" : "마력 %")),
        pctRow("DMG%", "데미지 %", "DMG%"),
        pctRow("BOSS%", "보스 데미지 %", "BOSS%"),
        pctRow("FD%", "최종 데미지 %", "FD%"),
        pctRow("CRIT%", "크리티컬 확률 %", "CRIT%"),
        pctRow("CDMG%", "크리티컬 데미지 %", "CDMG%"),
        pctRow("IED%", "방어율 무시 %", "IED%"),
      ],
    },
    {
      title: "총 스탯",
      rows: [...stats.map(([s, role]) => totalStatRow(s, role)), ...atts.map(totalAttRow)],
    },
  ];
}

function statFields(job: JobData | undefined): Field<MainStat>[] {
  return job
    ? [{ key: job.mainStat, label: `주스탯 (${job.mainStat})` }, ...job.subStats.map((s) => ({ key: s, label: `부스탯 (${s})` }))]
    : MAIN_STATS.map((s) => ({ key: s, label: s }));
}

function unionRaiderFields(job: JobData | undefined): Field<keyof UnionInput>[] {
  return [
    ...statFields(job),
    { key: "CRIT%", label: "크리티컬 확률", pct: true },
    { key: "CDMG%", label: "크리티컬 데미지", pct: true },
  ];
}

function unionGridFields(job: JobData | undefined): Field<UnionGridKey>[] {
  const cell = { unit: "칸" };
  const atts: Field<UnionGridKey>[] = [
    { key: "ATT", label: "공격력 (+1)", ...cell },
    { key: "MATT", label: "마력 (+1)", ...cell },
  ].filter((f) => !job || f.key === job.attackType) as Field<UnionGridKey>[];
  return [
    ...statFields(job).map((f) => ({ ...f, label: `${f.label} (+5)`, ...cell })),
    ...atts,
    { key: "CRIT%", label: "크리티컬 확률 (+1%)", ...cell },
    { key: "CDMG%", label: "크리티컬 데미지 (+0.5%)", ...cell },
    { key: "BOSS%", label: "보스 데미지 (+1%)", ...cell },
    { key: "IED%", label: "방어율 무시 (+1%)", ...cell },
  ];
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
  link: "링크 스킬",
  pet: "펫",
  "misc-item": "칭호·화살 등",
  collection: "도감",
  custom: "사용자 입력",
};

const fmt = (v: number, pct?: boolean) => (pct ? `${r2(v)}%` : Math.round(v).toLocaleString());
const signed = (v: number, pct?: boolean) => (v > 0 ? "+" : "") + fmt(v, pct);

const TAB_KEY = "msn:stat-input-tab";

const ALL_CHOICES = [...LINK_SKILLS, ...COLLECTION, ...TITLES];

const countOn = (defs: { id: string }[], input: PresetInput) => defs.filter((d) => input[d.id]?.on ?? true).length;
const countChosen = (defs: { id: string }[], input: ChoiceInput) => defs.filter((d) => input[d.id]).length;
const countFilled = (...inputs: Record<string, number | undefined>[]) =>
  inputs.reduce((n, i) => n + Object.values(i).filter(Boolean).length, 0);

type Saved = {
  buffs?: Record<string, boolean>;
  union?: UnionInput;
  unionGrid?: UnionGridInput;
  /** link skill levels, collection tier, title */
  choices?: ChoiceInput;
  miscItems?: PresetInput;
};

export default function StatPanel({ bundle }: { bundle: CharacterBundle }) {
  const { character } = bundle;
  const storageKey = `msn:stat-panel:${character.assetKey}`;

  const base = useMemo(() => collectCharacter(bundle), [bundle]);
  const sections = useMemo(() => buildSections(base.job), [base.job]);
  const inGame = useMemo(() => apStatToFinal(character.apStat), [character.apStat]);
  const defaults = useMemo(() => Object.fromEntries(base.buffs.map((b) => [b.id, b.defaultOn])), [base.buffs]);
  const ctx: Ctx = { ap: base.ap };

  const [buffs, setBuffs] = useState<Record<string, boolean>>(defaults);
  const [union, setUnion] = useState<UnionInput>({});
  const [unionGrid, setUnionGrid] = useState<UnionGridInput>({});
  const [choices, setChoices] = useState<ChoiceInput>(() => defaultChoiceInput(ALL_CHOICES));
  const [miscItems, setMiscItems] = useState<PresetInput>(() => defaultPresetInput(MISC_ITEMS));
  const [open, setOpen] = useState<string>();
  const [tab, setTab] = useState("buffs");

  useEffect(() => {
    // restore per-character settings and record this visit (localStorage is client-only)
    const saved = load<Saved>(storageKey, {});
    /* eslint-disable react-hooks/set-state-in-effect */
    if (saved.buffs) setBuffs({ ...defaults, ...saved.buffs });
    if (saved.union) setUnion(saved.union);
    if (saved.unionGrid) setUnionGrid(saved.unionGrid);
    if (saved.choices) setChoices({ ...defaultChoiceInput(ALL_CHOICES), ...saved.choices });
    if (saved.miscItems) setMiscItems({ ...defaultPresetInput(MISC_ITEMS), ...saved.miscItems });
    setTab(load(TAB_KEY, "buffs"));
    /* eslint-enable react-hooks/set-state-in-effect */
    pushRecent({
      assetKey: character.assetKey,
      name: character.common.name,
      jobName: character.common.job.jobName,
      level: character.common.level,
      imageUrl: character.image.imageUrl,
    });
  }, [storageKey, defaults, character]);

  const persist = (next: Saved) =>
    save(storageKey, { buffs, union, unionGrid, choices, miscItems, ...next } satisfies Saved);
  const setChoice = (next: ChoiceInput) => {
    setChoices(next);
    persist({ choices: next });
  };

  // API-derived stats plus what the user typed in (the API includes these but doesn't list them).
  const known = useMemo(
    () => [
      ...base.permanent,
      ...collectUnion(union),
      ...collectUnionGrid(unionGrid),
      ...collectChoices(LINK_SKILLS, choices, "link"),
      ...collectChoices(COLLECTION, choices, "collection"),
      ...collectChoices(TITLES, choices, "misc-item"),
      ...collectPresets(MISC_ITEMS, miscItems, "misc-item"),
    ],
    [base.permanent, union, unionGrid, choices, miscItems],
  );

  // Default buff set = what the API snapshot includes (season buff on, skill buffs off).
  // "버프 변화" and the API comparison use it.
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
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
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
            {sections.map((section) => (
              <Fragment key={section.title}>
                <tr className="border-t border-black/10 dark:border-white/15">
                  <td colSpan={5} className="px-3 pb-1 pt-3 text-xs font-semibold text-zinc-500">
                    {section.title}
                  </td>
                </tr>
                {section.rows.map((row) => {
                  const v = row.value(result, ctx);
                  const ref = row.value(reference, ctx);
                  const delta = v - ref;
                  const game = row.inGame && inGame[row.inGame];
                  const err = game === undefined ? undefined : ref - game;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => setOpen(open === row.id ? undefined : row.id)}
                        className={`cursor-pointer border-t border-black/5 hover:bg-black/[.03] dark:border-white/10 dark:hover:bg-white/[.04] ${open === row.id ? "bg-black/[.03] dark:bg-white/[.04]" : ""}`}
                      >
                        <td className="px-3 py-1.5">
                          {row.label}
                          {row.note && <span className="block text-[11px] text-zinc-500">{row.note(result, ctx)}</span>}
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
                        <Breakdown contributions={result.contributions.filter((c) => row.parts.includes(c.stat))} />
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-zinc-500">
          행을 누르면 출처별 내역이 보입니다. 오차 = 기본 버프 상태(시즌 버프만 켬)의 계산값 − 인게임 값. AP는 레벨 기준
          자동 분배로 추정합니다.
        </p>
      </div>

      <aside className="lg:sticky lg:top-4">
        <InputTabs
          active={tab}
          onChange={(id) => {
            setTab(id);
            save(TAB_KEY, id);
          }}
          tabs={
            [
              {
                id: "buffs",
                label: "버프",
                badge: base.buffs.filter((b) => buffs[b.id]).length,
                content: (
                  <>
                    <Hint>시즌 버프는 API 스탯에 포함되어 기본으로 켜져 있습니다. 스킬 버프는 포함되지 않으므로 체크하면 더해집니다.</Hint>
                    {base.buffs.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        {base.job ? "배운 버프 스킬이 없습니다." : `${character.common.job.jobName} 직업 데이터가 아직 없습니다.`}
                      </p>
                    ) : (
                      <CheckList
                        items={base.buffs.map((b) => ({
                          id: b.id,
                          name: b.name,
                          description: b.description ?? mergeEffects(b.contributions).map(formatEffect).join(", "),
                        }))}
                        checked={buffs}
                        onChange={(id, on) => {
                          const next = { ...buffs, [id]: on };
                          setBuffs(next);
                          persist({ buffs: next });
                        }}
                      />
                    )}
                  </>
                ),
              },
              {
                id: "links",
                label: "링크",
                badge: countChosen(LINK_SKILLS, choices),
                content: (
                  <>
                    <Hint>API 스탯에 포함된 링크 스킬입니다. 링크 레벨을 고르세요 (Lv.0 = 미보유).</Hint>
                    <ChoiceList defs={LINK_SKILLS} values={choices} onChange={setChoice} />
                  </>
                ),
              },
              {
                id: "union",
                label: "유니온",
                badge: countFilled(unionGrid, union),
                content: (
                  <>
                    <SubHeading title="점령 효과 (칸 수)" hint="주스탯·부스탯은 스탯%가 적용됩니다." />
                    <FieldList
                      fields={unionGridFields(base.job)}
                      values={unionGrid}
                      onChange={(next) => {
                        setUnionGrid(next);
                        persist({ unionGrid: next });
                      }}
                    />
                    <SubHeading title="공격대원 효과 (합계)" hint="주스탯·부스탯은 스탯%가 적용되지 않습니다." />
                    <FieldList
                      fields={unionRaiderFields(base.job)}
                      values={union}
                      onChange={(next) => {
                        setUnion(next);
                        persist({ union: next });
                      }}
                    />
                  </>
                ),
              },
              {
                id: "collection",
                label: "도감",
                badge: countChosen(COLLECTION, choices),
                content: (
                  <>
                    <Hint>API 스탯에 포함된 도감 효과입니다. 현재 도감 레벨을 고르세요.</Hint>
                    <ChoiceList defs={COLLECTION} values={choices} onChange={setChoice} />
                  </>
                ),
              },
              {
                id: "misc",
                label: "기타",
                badge: countChosen(TITLES, choices) + countOn(MISC_ITEMS, miscItems),
                content: (
                  <>
                    <Hint>API가 불러오지 못하지만 API 스탯에는 포함된 아이템입니다.</Hint>
                    <ChoiceList defs={TITLES} values={choices} onChange={setChoice} />
                    <SubHeading title="화살" />
                    <PresetList
                      defs={MISC_ITEMS}
                      values={miscItems}
                      onChange={(next) => {
                        setMiscItems(next);
                        persist({ miscItems: next });
                      }}
                    />
                  </>
                ),
              },
            ] satisfies Tab[]
          }
        />
      </aside>
    </div>
  );
}

function Breakdown({ contributions }: { contributions: StatContribution[] }) {
  const bySource = new Map<string, StatContribution[]>();
  for (const c of contributions) bySource.set(c.source, [...(bySource.get(c.source) ?? []), c]);
  return (
    <tr>
      <td colSpan={5} className="bg-black/[.02] px-3 py-2 dark:bg-white/[.03]">
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
                      <span className="shrink-0 tabular-nums">{formatEffect(c)}</span>
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
