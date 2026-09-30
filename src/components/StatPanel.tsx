"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { JobData } from "@/data/jobs";
import { COLLECTION } from "@/data/collection";
import { EMPRESS_BLESSING } from "@/data/jobs/common";
import { load, save } from "@/lib/client/storage";
import { useCharacterStats } from "@/lib/client/useCharacterStats";
import {
  API_PRESET,
  apStatToFinal,
  MAX_PETS,
  petAtt,
  PRESET_SLOTS,
  formatEffect,
  isRelevant,
  mergeEffects,
  sumStats,
  MAIN_STATS,
  type ChoiceInput,
  type ComputedStats,
  type FinalStats,
  type PresetInput,
  type MainStat,
  type StatContribution,
  type StatKey,
  type UnionGridKey,
  type UnionInput,
} from "@/lib/stats";
import type { CharacterBundle } from "@/types/msu";
import {
  AbilityLineList,
  CheckList,
  ChoiceList,
  describeEffects,
  FieldList,
  Hint,
  InputTabs,
  PresetList,
  SelectRow,
  SubHeading,
  TextLines,
  type Field,
  type Tab,
} from "./StatInputs";

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
  note: () => "하이퍼스탯·어빌리티·아케인·유니온 공격대원",
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

// Main/sub stat % include all stats %, since it applies to them the same way.
const statPctRow = (s: MainStat, role?: string): Row => ({
  id: `${s}%`,
  label: role ? `${role} % (${s})` : `${s} %`,
  note: (r) => `${s}% ${r2(t(r, `${s}%`))} + 올스탯% ${r2(t(r, "ALL%"))}`,
  pct: true,
  parts: [`${s}%`, "ALL%"],
  value: (r) => t(r, `${s}%`) + t(r, "ALL%"),
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
        ...stats.map(([s, role]) => statPctRow(s, role)),
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

/** Buff effects the job uses, plus the buff's note. */
const describeBuff = (b: { contributions: StatContribution[]; note?: string }, job: JobData | undefined) =>
  [...mergeEffects(b.contributions.filter((c) => isRelevant(c.stat, job))).map(formatEffect), b.note]
    .filter(Boolean)
    .join(", ");

const countOn = (defs: { id: string }[], input: PresetInput) => defs.filter((d) => input[d.id]?.on ?? true).length;
const countChosen = (defs: { id: string }[], input: ChoiceInput) => defs.filter((d) => input[d.id]).length;
const countFilled = (...inputs: Record<string, number | undefined>[]) =>
  inputs.reduce((n, i) => n + Object.values(i).filter(Boolean).length, 0);

const PRESET_OPTIONS = [
  { id: API_PRESET, label: "API (현재 적용 중)" },
  ...PRESET_SLOTS.map((id) => ({ id, label: `프리셋 ${id}` })),
];
const EMPRESS_OPTIONS = Array.from({ length: EMPRESS_BLESSING.maxLevel + 1 }, (_, n) => ({ id: String(n), label: `Lv.${n}` }));
const PET_OPTIONS = Array.from({ length: MAX_PETS + 1 }, (_, n) => ({ id: String(n), label: `${n}마리` }));

const COLLECTION_SET_FIELDS: Field<"ALL">[] = [{ key: "ALL", label: "세트 효과 올스탯" }];

export default function StatPanel({ bundle }: { bundle: CharacterBundle }) {
  const { character } = bundle;
  // inputs, their saved state and the stats built from them (shared with the calculators)
  const {
    base,
    season,
    miscDefs,
    linkDefs,
    titleDefs,
    hyperDefs,
    buffs,
    setBuffs,
    union,
    setUnion,
    unionGrid,
    setUnionGrid,
    choices,
    setChoices,
    miscItems,
    setMiscItems,
    collectionSet,
    setCollectionSet,
    petCount,
    setPets,
    empressLevel,
    setEmpress,
    hyperPreset,
    setHyperPreset,
    hyperPresets,
    setHyperPresets,
    hyperInput,
    abilityPreset,
    setAbilityPreset,
    abilityPresets,
    setAbilityPresets,
    abilityLines,
    abilityTypes,
    persist,
    result,
    reference,
  } = useCharacterStats(bundle);
  const sections = useMemo(() => buildSections(base.job), [base.job]);
  const inGame = useMemo(() => apStatToFinal(character.apStat), [character.apStat]);
  const ctx: Ctx = { ap: base.ap };
  const [open, setOpen] = useState<string>();
  const [tab, setTab] = useState("buffs");

  useEffect(() => {
    // localStorage is only readable after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab(load(TAB_KEY, "buffs"));
  }, []);

  const setChoice = (next: ChoiceInput) => {
    setChoices(next);
    persist({ choices: next });
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-sm">
          <thead className="bg-black/[.03] text-xs text-zinc-500 dark:bg-white/[.04]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">스탯</th>
              <th className="px-3 py-2 text-right font-medium">계산값</th>
              <th className="px-3 py-2 text-right font-medium">변화</th>
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
                  // follows the checked buffs, so it moves together with "버프 변화"
                  const err = game === undefined ? undefined : v - game;
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
          행을 누르면 출처별 내역이 보입니다. 변화 = API 기준 상태(API의 하이퍼 스탯·어빌리티 프리셋, 스킬 버프 끔) 대비
          변화량. 오차 = 계산값 − 인게임 값으로, 버프나 프리셋을 바꾸면 함께 바뀝니다. AP는 레벨 기준 자동 분배로 추정합니다.
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
                    <Hint>
                      {season
                        ? "시즌 버프 사용 중인 캐릭터로 설정되어 기본으로 켜져 있습니다."
                        : "시즌 버프를 사용하지 않는 캐릭터로 설정되어 있습니다."}{" "}
                      사용 여부는 캐릭터 목록에서 바꿉니다. 스킬 버프는 API 스탯에 포함되지 않으므로 체크하면 더해집니다.
                    </Hint>
                    {base.buffs.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        {base.job ? "배운 버프 스킬이 없습니다." : `${character.common.job.jobName} 직업 데이터가 아직 없습니다.`}
                      </p>
                    ) : (
                      <CheckList
                        items={base.buffs.map((b) => ({
                          id: b.id,
                          name: b.name,
                          description: describeBuff(b, base.job),
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
                id: "presets",
                label: "프리셋",
                badge: (hyperPreset === API_PRESET ? 0 : 1) + (abilityPreset === API_PRESET ? 0 : 1),
                content: (
                  <>
                    <Hint>
                      API는 지금 적용 중인 프리셋만 알려 줍니다. 프리셋 1~3은 직접 입력하며, 처음에는 API 값으로 채워져
                      있습니다. 바꾸면 API 프리셋 대비 변화량이 표에 나옵니다.
                    </Hint>
                    <SubHeading title="하이퍼 스탯" />
                    <SelectRow
                      label="프리셋"
                      value={hyperPreset}
                      options={PRESET_OPTIONS}
                      onChange={(id) => {
                        setHyperPreset(id);
                        persist({ hyperPreset: id });
                      }}
                    />
                    {hyperPreset === API_PRESET ? (
                      <TextLines
                        lines={mergeEffects(base.hyper.filter((c) => isRelevant(c.stat, base.job))).map(formatEffect)}
                        empty="스탯 표에 반영되는 하이퍼 스탯이 없습니다."
                      />
                    ) : (
                      <ChoiceList
                        defs={hyperDefs}
                        values={hyperInput}
                        job={base.job}
                        onChange={(next) => {
                          const all = { ...hyperPresets, [hyperPreset]: next };
                          setHyperPresets(all);
                          persist({ hyperPresets: all });
                        }}
                      />
                    )}
                    <SubHeading title="어빌리티" />
                    <SelectRow
                      label="프리셋"
                      value={abilityPreset}
                      options={PRESET_OPTIONS}
                      onChange={(id) => {
                        setAbilityPreset(id);
                        persist({ abilityPreset: id });
                      }}
                    />
                    {abilityPreset === API_PRESET ? (
                      <TextLines
                        lines={Object.values(character.ability).flatMap((a) => (a ? [a.desc] : []))}
                        empty="어빌리티가 없습니다."
                      />
                    ) : (
                      <AbilityLineList
                        types={abilityTypes}
                        lines={abilityLines}
                        onChange={(next) => {
                          const all = { ...abilityPresets, [abilityPreset]: next };
                          setAbilityPresets(all);
                          persist({ abilityPresets: all });
                        }}
                      />
                    )}
                  </>
                ),
              },
              {
                id: "links",
                label: "링크",
                badge: countChosen(linkDefs, choices),
                content: (
                  <>
                    <Hint>API 스탯에 포함된 링크 스킬입니다. 링크 레벨을 고르세요 (Lv.0 = 미보유).</Hint>
                    <ChoiceList defs={linkDefs} values={choices} onChange={setChoice} job={base.job} />
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
                badge: countChosen(COLLECTION, choices) + countFilled(collectionSet),
                content: (
                  <>
                    <Hint>API 스탯에 포함된 도감 효과입니다. 현재 도감 레벨을 고르세요.</Hint>
                    <ChoiceList defs={COLLECTION} values={choices} onChange={setChoice} job={base.job} />
                    <SubHeading title="세트 효과" hint="도감 세트 효과로 얻은 올스탯 합계를 입력하세요. 스탯%가 적용됩니다." />
                    <FieldList
                      fields={COLLECTION_SET_FIELDS}
                      values={collectionSet}
                      onChange={(next) => {
                        setCollectionSet(next);
                        persist({ collectionSet: next });
                      }}
                    />
                  </>
                ),
              },
              {
                id: "misc",
                label: "기타",
                badge: countChosen(titleDefs, choices) + countOn(miscDefs, miscItems),
                content: (
                  <>
                    <Hint>API가 불러오지 못하지만 API 스탯에는 포함된 아이템입니다.</Hint>
                    <ChoiceList defs={titleDefs} values={choices} onChange={setChoice} job={base.job} />
                    {!base.apiEmpressBlessing && (
                      <>
                        <SubHeading
                          title="여제의 축복"
                          hint="API가 이 캐릭터의 Empress's Blessing을 알려 주지 않아 직접 고릅니다. Blessing of the Fairy와 비교해 높은 쪽만 적용됩니다."
                        />
                        <SelectRow
                          label={EMPRESS_BLESSING.name}
                          value={String(empressLevel)}
                          options={EMPRESS_OPTIONS}
                          note={describeEffects([{ key: "ATT_MATT", value: empressLevel }], base.job)}
                          onChange={(id) => {
                            setEmpress(Number(id));
                            persist({ empress: Number(id) });
                          }}
                        />
                      </>
                    )}
                    <SubHeading title="펫" hint="펫 1마리는 펫장비 1개와 한 세트로 계산합니다." />
                    <SelectRow
                      label="펫 수"
                      value={String(petCount)}
                      options={PET_OPTIONS}
                      note={describeEffects([{ key: "ATT_MATT", value: petAtt(petCount) }], base.job)}
                      onChange={(id) => {
                        setPets(Number(id));
                        persist({ pets: Number(id) });
                      }}
                    />
                    {miscDefs.length > 0 && (
                      <>
                        <SubHeading title="화살" />
                        <PresetList
                          defs={miscDefs}
                          values={miscItems}
                          onChange={(next) => {
                            setMiscItems(next);
                            persist({ miscItems: next });
                          }}
                          job={base.job}
                        />
                      </>
                    )}
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

// Sources shown together under one expandable heading in the breakdown.
const SOURCE_GROUPS: { id: string; name: string; sources: StatContribution["source"][] }[] = [
  { id: "equip", name: "장비", sources: ["equip-base", "starforce", "flame", "potential", "bonus-potential", "set"] },
  { id: "skill", name: "스킬", sources: ["skill", "link", "pet", "job-buff"] },
];

/** Per-stat totals of a set of contributions, in first-seen order (IED/FD combined multiplicatively). */
function summarize(list: StatContribution[]): string {
  const totals = sumStats(list);
  const order = [...new Set(list.map((c) => c.stat))];
  return order
    .map((stat) => ({ stat, value: totals[stat] ?? 0 }))
    .filter((e) => Math.abs(e.value) >= 0.005)
    .map(formatEffect)
    .join(" · ");
}

function bySource(list: StatContribution[]): Map<StatContribution["source"], StatContribution[]> {
  const map = new Map<StatContribution["source"], StatContribution[]>();
  for (const c of list) map.set(c.source, [...(map.get(c.source) ?? []), c]);
  return map;
}

function SourceBlock({ source, list }: { source: StatContribution["source"]; list: StatContribution[] }) {
  return (
    <div>
      <p className="text-xs font-semibold">{SOURCE_NAMES[source]}</p>
      <ul className="text-[11px] text-zinc-600 dark:text-zinc-400">
        {list.map((c, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="truncate">{c.label}</span>
            <span className="shrink-0 tabular-nums">{formatEffect(c)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Breakdown({ contributions }: { contributions: StatContribution[] }) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const sources = bySource(contributions);
  const grouped = new Set(SOURCE_GROUPS.flatMap((g) => g.sources));
  const others = [...sources].filter(([source]) => !grouped.has(source));

  const toggle = (id: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <tr>
      <td colSpan={5} className="bg-black/[.02] px-3 py-2 dark:bg-white/[.03]">
        {contributions.length === 0 ? (
          <p className="text-xs text-zinc-500">내역 없음</p>
        ) : (
          <div className="space-y-2">
            {SOURCE_GROUPS.map((g) => {
              const members = g.sources.filter((s) => sources.has(s));
              if (members.length === 0) return null;
              const open = openGroups.has(g.id);
              return (
                <div key={g.id} className="rounded border border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => toggle(g.id)}
                    aria-expanded={open}
                    className="flex w-full items-start gap-2 px-2 py-1.5 text-left hover:bg-black/[.03] dark:hover:bg-white/[.04]"
                  >
                    <span className="w-3 shrink-0 text-[10px] leading-5 text-zinc-500">{open ? "▾" : "▸"}</span>
                    <span className="shrink-0 text-xs font-semibold leading-5">{g.name}</span>
                    <span className="flex-1 text-right text-[11px] leading-5 tabular-nums text-zinc-600 dark:text-zinc-400">
                      {summarize(members.flatMap((s) => sources.get(s)!))}
                    </span>
                  </button>
                  {open && (
                    <div className="grid gap-3 border-t border-black/10 px-2 py-2 sm:grid-cols-2 dark:border-white/10">
                      {members.map((s) => (
                        <SourceBlock key={s} source={s} list={sources.get(s)!} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {others.length > 0 && (
              <div className="grid gap-3 px-2 pt-1 sm:grid-cols-2">
                {others.map(([source, list]) => (
                  <SourceBlock key={source} source={source} list={list} />
                ))}
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
