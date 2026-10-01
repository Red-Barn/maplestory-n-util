"use client";

import { useMemo, useRef, useState } from "react";
import ItemPicker from "@/components/ItemPicker";
import { MAX_STAR, PROTECT_MAX_STAR, PROTECT_MIN_STAR } from "@/data/starforce";
import {
  expectedToTarget,
  pricedUpTo,
  seededRng,
  simulateRuns,
  summarize,
  type Run,
  type StarforceOptions,
  type StarPrices,
  type Summary,
} from "@/lib/calc/starforce";
import type { ItemRef } from "@/types/items";
import type { CharacterBundle, ItemDetail } from "@/types/msu";
import { count, neso } from "./format";
import PriceTable from "./PriceTable";
import ResultTable, { type Combo } from "./ResultTable";
import { useItemInfo } from "./useItemInfo";
import { useStarforcePrices } from "./useStarforcePrices";

const SLOT_NAMES: Record<string, string> = {
  cap: "모자",
  faceAcc: "얼굴장식",
  eyeAcc: "눈장식",
  earAcc: "귀고리",
  pendant1: "펜던트",
  pendant2: "펜던트2",
  clothes: "상의",
  pants: "하의",
  shoes: "신발",
  gloves: "장갑",
  cape: "망토",
  shoulder: "어깨장식",
  belt: "벨트",
  ring1: "반지1",
  ring2: "반지2",
  ring3: "반지3",
  ring4: "반지4",
  weapon: "무기",
  subWeapon: "보조무기",
  emblem: "엠블렘",
  pocket: "포켓",
  badge: "뱃지",
  medal: "훈장",
};

const COMBOS: StarforceOptions[] = [
  { starCatch: false, protect: false },
  { starCatch: true, protect: false },
  { starCatch: false, protect: true },
  { starCatch: true, protect: true },
];

// Simulation size: up to MAX_RUNS items, fewer when one item takes many attempts, so the total
// stays around STEP_BUDGET attempts. Below MIN_RUNS the percentiles aren't worth showing.
const MAX_RUNS = 10000;
const MIN_RUNS = 200;
const STEP_BUDGET = 10_000_000;
const CHUNK_STEPS = 250_000;

const maxStarOf = (item: ItemDetail) => Math.min(item.enhance.starforce.maxStarforce, MAX_STAR);

/** What the calculator needs of an item, whether equipped or found by name. */
type Target = { itemId: number; name: string; maxStar: number; current: number };

type Mode = "equip" | "search";
const MODES: [Mode, string][] = [
  ["equip", "장착 장비"],
  ["search", "아이템 이름으로 찾기"],
];

/** Star force calculator: pick an equipped item or find one by name, then the stars to go from and to. */
export default function StarforceCalculator({ bundle }: { bundle: CharacterBundle }) {
  const items = useMemo(
    () =>
      Object.entries(bundle.items).filter(
        (entry): entry is [string, ItemDetail] => !!entry[1] && entry[1].common.itemId > 0 && maxStarOf(entry[1]) > 0,
      ),
    [bundle.items],
  );
  const [mode, setMode] = useState<Mode>(items.length > 0 ? "equip" : "search");
  const [slot, setSlot] = useState(items[0]?.[0]);
  // kept while switching modes, so going back shows the same item
  const [picked, setPicked] = useState<ItemRef>();

  return (
    <div className="space-y-6">
      <div role="tablist" className="flex gap-1 border-b border-black/10 dark:border-white/15">
        {MODES.map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={m === mode}
            onClick={() => setMode(m)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              m === mode ? "border-orange-500" : "border-transparent text-zinc-500 hover:text-current"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "equip" ? (
        <EquippedItems items={items} slot={slot} onSelect={setSlot} />
      ) : (
        <SearchedItem picked={picked} onPick={setPicked} />
      )}
    </div>
  );
}

function EquippedItems(props: { items: [string, ItemDetail][]; slot?: string; onSelect: (slot: string) => void }) {
  const item = props.items.find(([s]) => s === props.slot)?.[1];
  if (!item) return <p className="text-sm text-zinc-500">스타포스를 강화할 수 있는 장착 장비가 없습니다.</p>;
  const maxStar = maxStarOf(item);
  const target: Target = {
    itemId: item.common.itemId,
    name: item.name,
    maxStar,
    current: Math.min(item.enhance.starforce.enhanced, maxStar),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {props.items.map(([s, it]) => (
          <button
            key={s}
            type="button"
            onClick={() => props.onSelect(s)}
            aria-pressed={s === props.slot}
            className={`flex items-center gap-2 rounded-lg border p-2 text-left ${
              s === props.slot
                ? "border-orange-500 bg-orange-500/10"
                : "border-black/10 hover:border-orange-500 dark:border-white/15"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small external icons */}
            <img src={it.image.iconImageUrl} alt="" className="h-9 w-9 shrink-0 object-contain" />
            <span className="min-w-0">
              <span className="block text-[11px] text-zinc-500">{SLOT_NAMES[s] ?? s}</span>
              <span className="block truncate text-xs font-medium">{it.name}</span>
              <span className="block text-[10px] text-amber-500">
                ★ {it.enhance.starforce.enhanced} / {maxStarOf(it)}
              </span>
            </span>
          </button>
        ))}
      </div>
      {/* keyed by item: stars, prices typed in and simulation results belong to one item */}
      <ItemCalculator key={`equip:${props.slot}`} target={target} />
    </div>
  );
}

function SearchedItem({ picked, onPick }: { picked?: ItemRef; onPick: (item: ItemRef) => void }) {
  const { info, error, loading } = useItemInfo(picked?.id);
  const maxStar = Math.min(info?.maxStarforce ?? 0, MAX_STAR);

  return (
    <div className="space-y-6">
      <div className="max-w-md space-y-1">
        <ItemPicker onSelect={onPick} placeholder="장비 이름 (2글자 이상, 영문)" />
        <p className="text-xs text-zinc-500">장착하지 않은 장비도 이름으로 찾아 0성부터 계산할 수 있습니다.</p>
      </div>
      {loading && <p className="text-sm text-zinc-500">아이템 정보를 불러오는 중…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && (
        <>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- small external icons */}
            <img src={info.iconUrl} alt="" className="h-10 w-10 shrink-0 object-contain" />
            <div className="min-w-0 text-sm">
              <p className="font-medium">{info.name}</p>
              <p className="text-xs text-zinc-500">
                Lv.{info.requiredLevel} · {info.category.tier3 ?? info.category.label}
                {maxStar > 0 && ` · 최대 ★${maxStar}`}
              </p>
            </div>
          </div>
          {maxStar > 0 ? (
            <ItemCalculator
              key={`search:${info.id}`}
              target={{ itemId: info.id, name: info.name, maxStar, current: 0 }}
            />
          ) : (
            <p className="text-sm text-zinc-500">스타포스를 강화할 수 없는 아이템입니다.</p>
          )}
        </>
      )}
    </div>
  );
}

type Simulation = { key: string; summary?: Summary; progress: number; runs: number };

function ItemCalculator({ target }: { target: Target }) {
  const { maxStar, current } = target;
  const [from, setFrom] = useState(current);
  const [to, setTo] = useState(Math.min(current + 1, maxStar));
  const [opts, setOpts] = useState<StarforceOptions>(COMBOS[0]);
  const [overrides, setOverrides] = useState<StarPrices>({});
  const { prices: api, error, loading, reload } = useStarforcePrices(target.itemId);

  const prices = useMemo(() => ({ ...api?.starforce, ...overrides }), [api, overrides]);
  const combos: Combo[] = useMemo(
    () => COMBOS.map((o) => ({ opts: o, expected: expectedToTarget(from, to, prices, o) })),
    [from, to, prices],
  );
  const chosen = combos.find((c) => c.opts.starCatch === opts.starCatch && c.opts.protect === opts.protect) ?? combos[0];
  // Without Protect every star that any option can visit is reachable, so list those.
  const stars = useMemo(
    () => Object.keys(combos[0].expected.attemptsAt).map(Number).sort((a, b) => a - b),
    [combos],
  );
  const missing = stars.filter((star) => chosen.expected.attemptsAt[star] && !(prices[star] > 0));
  const priced = missing.length === 0;
  // nothing to complain about while the first prices are still on their way
  const waiting = loading && !api;

  // ---- simulation (chosen options only) ----
  const simKey = JSON.stringify([from, to, opts, prices]);
  const [sim, setSim] = useState<Simulation>();
  const running = useRef(0);
  const runs = Math.min(MAX_RUNS, Math.floor(STEP_BUDGET / Math.max(1, chosen.expected.attempts)));
  const shown = sim?.key === simKey ? sim : undefined;

  async function simulate() {
    const token = ++running.current;
    const rng = seededRng(Date.now());
    const perChunk = Math.max(1, Math.floor(CHUNK_STEPS / Math.max(1, chosen.expected.attempts)));
    const done: Run[] = [];
    while (done.length < runs) {
      done.push(...simulateRuns(from, to, prices, opts, Math.min(perChunk, runs - done.length), rng));
      setSim({ key: simKey, progress: done.length, runs });
      // let the page repaint between chunks
      await new Promise((resolve) => setTimeout(resolve));
      if (running.current !== token) return;
    }
    setSim({ key: simKey, progress: runs, runs, summary: summarize(done) });
  }

  // Targets past the first star the price API gives 0 for (e.g. 22–24 ★ while the metadata says
  // 25) stay selectable for typed-in prices, but are marked.
  const pricedTo = api ? pricedUpTo(prices, from, maxStar) : maxStar;
  const starOptions = (min: number, max: number, markUnpriced = false) =>
    Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i).map((star) => (
      <option key={star} value={star}>
        {star}성{markUnpriced && star > pricedTo ? " (가격 없음)" : ""}
      </option>
    ));
  const select =
    "rounded border border-black/15 bg-transparent px-2 py-1 text-sm focus:border-orange-500 focus:outline-none dark:border-white/20 dark:bg-zinc-900";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="font-medium">{target.name}</span>
        <label className="flex items-center gap-2">
          현재
          <select
            className={select}
            value={from}
            onChange={(e) => {
              const v = Number(e.target.value);
              setFrom(v);
              if (to <= v) setTo(Math.min(v + 1, maxStar));
            }}
          >
            {starOptions(0, maxStar - 1)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          목표
          <select className={select} value={to} onChange={(e) => setTo(Number(e.target.value))}>
            {starOptions(from + 1, maxStar, true)}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={opts.starCatch}
            onChange={(e) => setOpts({ ...opts, starCatch: e.target.checked })}
          />
          Star Catch
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={opts.protect} onChange={(e) => setOpts({ ...opts, protect: e.target.checked })} />
          Major Failure Protect ({PROTECT_MIN_STAR}~{PROTECT_MAX_STAR}성)
        </label>
      </div>

      {to <= from ? (
        <p className="text-sm text-zinc-500">이미 최대 성입니다.</p>
      ) : (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              {from}성 → {to}성 기대값
            </h3>
            <ResultTable combos={combos} selected={opts} priced={priced} onSelect={setOpts} />
            {!priced && !waiting && (
              <p className="text-xs text-red-600">
                {missing.map((s) => `${s}성`).join(", ")}의 비용이 없어 기대 비용을 계산할 수 없습니다. 가격 API가
                주지 않는 성은 아직 강화할 수 없는 구간일 수 있습니다. 계산하려면 아래 표에 직접 입력해 주세요.
              </p>
            )}
            <p className="text-xs text-zinc-500">
              줄을 누르면 그 옵션으로 바뀝니다. Protect는 {PROTECT_MIN_STAR}~{PROTECT_MAX_STAR}성의 비용을 2배로 하고
              Major Failure를 없앱니다. Drop이 2번 연속되면 다음 강화는 100% 성공합니다(이때는 Protect 비용 없음).
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">성별 확률과 비용</h3>
              <span className="flex items-center gap-2 text-xs text-zinc-500">
                {loading && "가격 불러오는 중…"}
                {!loading && api?.asOf && `가격 기준 ${new Date(api.asOf).toLocaleString()}`}
                <button type="button" onClick={reload} disabled={loading} className="text-orange-600 hover:underline disabled:opacity-50">
                  새로고침
                </button>
                {Object.keys(overrides).length > 0 && (
                  <button type="button" onClick={() => setOverrides({})} className="text-orange-600 hover:underline">
                    직접 입력 모두 지우기
                  </button>
                )}
              </span>
            </div>
            {error && <p className="text-xs text-red-600">{error} 비용을 직접 입력해 계산할 수 있습니다.</p>}
            <PriceTable
              stars={stars}
              opts={opts}
              apiPrices={api?.starforce ?? {}}
              overrides={overrides}
              attemptsAt={chosen.expected.attemptsAt}
              onOverride={(star, price) =>
                setOverrides((prev) => {
                  const next = { ...prev };
                  if (price == null) delete next[star];
                  else next[star] = price;
                  return next;
                })
              }
            />
            <p className="text-xs text-zinc-500">
              가격은 장비마다 다르고 1분마다 바뀝니다. Drop이나 Major Failure로 내려갈 수 있는 성도 함께 표시됩니다.
              확률은 선택한 옵션 기준이고, 기대 시도는 그 성에서 강화를 시도하는 평균 횟수입니다.
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold">비용 분포 (시뮬레이션)</h3>
              {priced && runs >= MIN_RUNS && (
                <button
                  type="button"
                  onClick={simulate}
                  className="rounded border border-orange-500 px-2 py-0.5 text-xs text-orange-600 hover:bg-orange-500/10"
                >
                  {runs.toLocaleString()}회 시뮬레이션
                </button>
              )}
              {shown && !shown.summary && (
                <span className="text-xs text-zinc-500">
                  {shown.progress.toLocaleString()} / {shown.runs.toLocaleString()}
                </span>
              )}
            </div>
            {!priced && <p className="text-xs text-zinc-500">비용을 모두 채우면 실행할 수 있습니다.</p>}
            {priced && runs < MIN_RUNS && (
              <p className="text-xs text-zinc-500">
                한 번에 평균 {count(chosen.expected.attempts, 0)}회를 시도해야 해서 브라우저에서 분포를 구하기에는 너무
                깁니다. 위의 기대값만 제공합니다.
              </p>
            )}
            {shown?.summary && <SpreadTable summary={shown.summary} />}
          </section>
        </>
      )}
    </div>
  );
}

function SpreadTable({ summary }: { summary: Summary }) {
  const cell = "px-2 py-1.5 text-right tabular-nums";
  const rows: [string, (s: Summary["cost"]) => number][] = [
    ["운이 좋을 때 (하위 10%)", (s) => s.p10],
    ["중앙값", (s) => s.median],
    ["운이 나쁠 때 (상위 10%)", (s) => s.p90],
    ["평균", (s) => s.mean],
  ];
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-sm">
        <thead className="text-xs text-zinc-500">
          <tr className="border-b border-black/10 dark:border-white/15">
            <th className="px-2 py-1.5 text-left font-medium">{summary.runs.toLocaleString()}회 결과</th>
            <th className={`${cell} font-medium`}>비용 (NESO)</th>
            <th className={`${cell} font-medium`}>시도 횟수</th>
            <th className={`${cell} font-medium`}>Major Failure</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, pick]) => (
            <tr key={label} className="border-b border-black/5 last:border-0 dark:border-white/10">
              <td className="px-2 py-1.5">{label}</td>
              <td className={cell}>{neso(pick(summary.cost))}</td>
              <td className={cell}>{count(pick(summary.attempts), 1)}</td>
              <td className={cell}>{count(pick(summary.majorFailures), 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
