"use client";

import { useMemo, useRef, useState } from "react";
import { MAX_STAR, PROTECT_MAX_STAR, PROTECT_MIN_STAR } from "@/data/starforce";
import {
  expectedToTarget,
  seededRng,
  simulateRuns,
  summarize,
  type Run,
  type StarforceOptions,
  type StarPrices,
  type Summary,
} from "@/lib/calc/starforce";
import type { CharacterBundle, ItemDetail } from "@/types/msu";
import { count, neso } from "./format";
import PriceTable from "./PriceTable";
import ResultTable, { type Combo } from "./ResultTable";
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

/** Star force calculator: pick an equipped item, then the stars to go from and to. */
export default function StarforceCalculator({ bundle }: { bundle: CharacterBundle }) {
  const items = useMemo(
    () =>
      Object.entries(bundle.items).filter(
        (entry): entry is [string, ItemDetail] => !!entry[1] && entry[1].common.itemId > 0 && maxStarOf(entry[1]) > 0,
      ),
    [bundle.items],
  );
  const [slot, setSlot] = useState(items[0]?.[0]);
  const item = items.find(([s]) => s === slot)?.[1];

  if (!item) return <p className="text-sm text-zinc-500">스타포스를 강화할 수 있는 장착 장비가 없습니다.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map(([s, it]) => (
          <button
            key={s}
            type="button"
            onClick={() => setSlot(s)}
            aria-pressed={s === slot}
            className={`flex items-center gap-2 rounded-lg border p-2 text-left ${
              s === slot ? "border-orange-500 bg-orange-500/10" : "border-black/10 hover:border-orange-500 dark:border-white/15"
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
      {/* keyed by slot: stars, prices typed in and simulation results belong to one item */}
      <ItemCalculator key={slot} item={item} />
    </div>
  );
}

type Simulation = { key: string; summary?: Summary; progress: number; runs: number };

function ItemCalculator({ item }: { item: ItemDetail }) {
  const maxStar = maxStarOf(item);
  const current = Math.min(item.enhance.starforce.enhanced, maxStar);
  const [from, setFrom] = useState(current);
  const [to, setTo] = useState(Math.min(current + 1, maxStar));
  const [opts, setOpts] = useState<StarforceOptions>(COMBOS[0]);
  const [overrides, setOverrides] = useState<StarPrices>({});
  const { prices: api, error, loading, reload } = useStarforcePrices(item.common.itemId);

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

  const starOptions = (min: number, max: number) =>
    Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i).map((star) => (
      <option key={star} value={star}>
        {star}성
      </option>
    ));
  const select =
    "rounded border border-black/15 bg-transparent px-2 py-1 text-sm focus:border-orange-500 focus:outline-none dark:border-white/20 dark:bg-zinc-900";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="font-medium">{item.name}</span>
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
            {starOptions(from + 1, maxStar)}
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
                {missing.map((s) => `${s}성`).join(", ")}의 비용이 없어 기대 비용을 계산할 수 없습니다. 아래 표에 직접
                입력해 주세요.
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
