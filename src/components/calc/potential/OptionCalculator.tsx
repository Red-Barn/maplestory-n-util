"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GRADE_TYPES,
  GRADES,
  MAX_OPTION_SETS,
  MAX_PROBABILITY_LEVEL,
  MAX_SET_CONDITIONS,
  OPTION_CUBES,
  PARTS,
  type Part,
} from "@/data/potential";
import { EFFECT_LABELS, effectsIn, matchOptions, type Effect, type LineOption, type OptionSet } from "@/lib/calc/potential/options";
import { expectedTries, triesForConfidence } from "@/lib/calc/potential/tierUp";
import { Field, INPUT_CLASS, neso, percent, positive, PriceField, SELECT_CLASS } from "./fields";
import ProbabilityTables from "./ProbabilityTables";
import { cubePrice, type PotentialItem } from "./usePotentialItem";

/** GET /api/potential/probability (issue #42). Only the fields used here. */
type ProbabilityResponse = { level: number; levelRange: [number, number] | null; lines: LineOption[][] };

type Row = { effect: Effect; min?: number };
type EditableSet = { id: number; rows: Row[] };

/** Inputs that follow the item until the user changes them; forgotten when the item changes. */
type Overrides = { grade?: number; part?: Part; level?: number; price?: number };

const PREFERRED_CUBES = ["RED", "BONUS_POTENTIAL"];

function useProbability(query: string | undefined) {
  const [state, setState] = useState<{ query: string; data?: ProbabilityResponse; error?: string }>();
  useEffect(() => {
    if (!query) return;
    let stale = false;
    fetch(`/api/potential/probability?${query}`)
      .then(async (res) => {
        const body = await res.json();
        if (stale) return;
        setState(res.ok ? { query, data: body } : { query, error: body.error ?? "옵션 확률을 불러오지 못했습니다." });
      })
      .catch(() => {
        if (!stale) setState({ query, error: "옵션 확률을 불러오지 못했습니다." });
      });
    return () => {
      stale = true;
    };
  }, [query]);
  return state?.query === query ? state : undefined;
}

/**
 * Chance that one cube rolls the options the user wants (any of up to 15 sets of up to 3 lines),
 * the cubes that takes, and the per-line tables and matching combinations to check it against.
 */
export default function OptionCalculator({ sel }: { sel: PotentialItem }) {
  const [cubeId, setCubeId] = useState<number>();
  const [overrides, setOverrides] = useState<{ key: string; values: Overrides }>({ key: sel.resetKey, values: {} });
  const [sets, setSets] = useState<EditableSet[]>([{ id: 1, rows: [] }]);
  const [nextId, setNextId] = useState(2);

  const own = overrides.key === sel.resetKey ? overrides.values : {};
  const override = (next: Overrides) => setOverrides({ key: sel.resetKey, values: { ...own, ...next } });

  const cubes = OPTION_CUBES.filter((c) => c.kind === sel.kind);
  const cube =
    cubes.find((c) => c.id === cubeId) ?? cubes.find((c) => PREFERRED_CUBES.includes(c.cubeType)) ?? cubes[0];
  const grade = own.grade ?? (sel.detectedGrade > 0 ? sel.detectedGrade : 4);
  const part = own.part ?? sel.part ?? "WEAPON";
  const level = own.level ?? sel.level ?? MAX_PROBABILITY_LEVEL;

  const query = new URLSearchParams({
    cube: cube.cubeType,
    grade: GRADE_TYPES[grade],
    part,
    level: String(Math.min(level, MAX_PROBABILITY_LEVEL)),
  }).toString();
  const probability = useProbability(level > 0 ? query : undefined);
  const lines = useMemo(() => probability?.data?.lines ?? [], [probability]);
  const effects = useMemo(() => effectsIn(lines), [lines]);

  const optionSets: OptionSet[] = useMemo(
    () => sets.map((s) => s.rows.flatMap((r) => (r.min ? [{ effect: r.effect, min: r.min }] : []))),
    [sets],
  );
  const match = useMemo(() => matchOptions(lines, optionSets), [lines, optionSets]);
  const anyCondition = optionSets.some((s) => s.length > 0);

  const { apiPrice, hint } = cubePrice(sel, cube.id);
  const price = own.price ?? apiPrice;

  const updateSet = (id: number, rows: Row[]) => setSets(sets.map((s) => (s.id === id ? { ...s, rows } : s)));
  const firstEffect = effects[0]?.effect ?? "BOSS%";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="큐브">
          <select
            value={cube.id}
            onChange={(e) => {
              setCubeId(Number(e.target.value));
              override({ price: undefined });
            }}
            className={SELECT_CLASS}
          >
            {cubes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="등급">
          <select value={grade} onChange={(e) => override({ grade: Number(e.target.value) })} className={SELECT_CLASS}>
            {GRADES.map((g) => (
              <option key={g.grade} value={g.grade}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="부위">
          <select value={part} onChange={(e) => override({ part: e.target.value as Part })} className={SELECT_CLASS}>
            {PARTS.map((p) => (
              <option key={p.part} value={p.part}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="장비 레벨" hint={`${MAX_PROBABILITY_LEVEL} 이상은 같은 표를 씁니다.`}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            step={1}
            value={level}
            onChange={(e) => {
              const v = positive(e.target.value);
              override({ level: v === undefined ? undefined : Math.min(200, Math.floor(v)) });
            }}
            className={INPUT_CLASS}
          />
        </Field>
        <PriceField value={own.price} apiPrice={apiPrice} hint={hint} onChange={(v) => override({ price: v })} />
      </div>

      {!probability ? (
        <p className="text-sm text-zinc-500">옵션 확률을 불러오는 중…</p>
      ) : probability.error ? (
        <p className="text-sm text-red-600">{probability.error}</p>
      ) : lines.length < 3 ? (
        <p className="text-sm text-zinc-500">이 큐브·등급·부위·레벨 조합의 옵션 확률이 없습니다.</p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">
              옵션 세트마다 최대 3줄까지 효과와 최소 수치를 고릅니다. 세트 안의 줄은 모두 충족해야 하고(3줄에 나온 그
              효과의 합 ≥ 최소 수치, STR·DEX·INT·LUK %는 올스탯 % 포함), 세트는 하나만 충족해도 성공입니다.
            </p>
            {effects.map((e) => (
              <datalist key={e.effect} id={`option-values-${e.effect}`}>
                {e.values.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            ))}
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {sets.map((set, i) => (
                <div key={set.id} className="space-y-2 rounded-lg border border-black/10 p-3 dark:border-white/15">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      옵션 세트 {i + 1}
                      {sets.length > 1 && anyCondition && (
                        <span className="ml-2 font-normal text-zinc-500 tabular-nums">{percent(match.setChances[i])}</span>
                      )}
                    </span>
                    {sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSets(sets.filter((s) => s.id !== set.id))}
                        className="text-xs text-zinc-500 hover:text-red-600"
                        aria-label={`옵션 세트 ${i + 1} 삭제`}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  {set.rows.map((row, r) => (
                    <div key={r} className="flex items-center gap-1.5">
                      <select
                        value={row.effect}
                        aria-label="효과"
                        onChange={(e) =>
                          updateSet(set.id, set.rows.map((x, k) => (k === r ? { ...x, effect: e.target.value as Effect } : x)))
                        }
                        className={`min-w-0 flex-1 ${SELECT_CLASS}`}
                      >
                        {!effects.some((e) => e.effect === row.effect) && (
                          <option value={row.effect}>{EFFECT_LABELS[row.effect]} (이 표에 없음)</option>
                        )}
                        {effects.map((e) => (
                          <option key={e.effect} value={e.effect}>
                            {EFFECT_LABELS[e.effect]}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label="최소 수치"
                        min={0}
                        step="any"
                        list={`option-values-${row.effect}`}
                        value={row.min ?? ""}
                        placeholder="최소"
                        onChange={(e) =>
                          updateSet(set.id, set.rows.map((x, k) => (k === r ? { ...x, min: positive(e.target.value) } : x)))
                        }
                        className={`${INPUT_CLASS} !w-20`}
                      />
                      <button
                        type="button"
                        onClick={() => updateSet(set.id, set.rows.filter((_, k) => k !== r))}
                        className="px-1 text-xs text-zinc-500 hover:text-red-600"
                        aria-label="줄 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {set.rows.length < MAX_SET_CONDITIONS && (
                    <button
                      type="button"
                      onClick={() => updateSet(set.id, [...set.rows, { effect: firstEffect }])}
                      className="text-xs text-orange-600 hover:underline"
                    >
                      + 줄 추가
                    </button>
                  )}
                </div>
              ))}
            </div>
            {sets.length < MAX_OPTION_SETS && (
              <button
                type="button"
                onClick={() => {
                  setSets([...sets, { id: nextId, rows: [] }]);
                  setNextId(nextId + 1);
                }}
                className="rounded border border-black/15 px-3 py-1 text-sm hover:border-orange-500 dark:border-white/20"
              >
                + 옵션 세트 추가 ({sets.length}/{MAX_OPTION_SETS})
              </button>
            )}
          </div>

          {anyCondition && <OptionSummary p={match.p} cases={match.cases.length} price={price} />}

          <ProbabilityTables lines={lines} match={anyCondition ? match : undefined} />
        </>
      )}
      <p className="text-[11px] text-zinc-500">
        옵션 확률: msu.io 확률 공개 페이지의 확률 검색 결과(레벨 {MAX_PROBABILITY_LEVEL} 이상은 {MAX_PROBABILITY_LEVEL}로
        조회). 큐브를 쓰는 동안 등급은 그대로라고 보고 계산합니다.
      </p>
    </div>
  );
}

function OptionSummary({ p, cases, price }: { p: number; cases: number; price?: number }) {
  const TD = "px-3 py-1.5 text-right";
  if (p === 0) return <p className="text-sm text-zinc-500">조건을 충족하는 조합이 없습니다.</p>;
  const counts = { expected: expectedTries(p), n90: triesForConfidence(p, 0.9), n99: triesForConfidence(p, 0.99) };
  const count = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-xs tabular-nums">
        <thead className="bg-black/5 text-zinc-500 dark:bg-white/5">
          <tr>
            <th className="px-3 py-1.5 text-right font-medium">큐브 1개 성공 확률</th>
            <th className="px-3 py-1.5 text-right font-medium">경우의 수</th>
            <th className="px-3 py-1.5 text-right font-medium">기대 개수</th>
            <th className="px-3 py-1.5 text-right font-medium">90% 개수</th>
            <th className="px-3 py-1.5 text-right font-medium">99% 개수</th>
            {price !== undefined && (
              <>
                <th className="px-3 py-1.5 text-right font-medium">기대 비용</th>
                <th className="px-3 py-1.5 text-right font-medium">90% 비용</th>
                <th className="px-3 py-1.5 text-right font-medium">99% 비용</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${TD} font-semibold`}>{percent(p, 6)}</td>
            <td className={TD}>{cases.toLocaleString()}</td>
            <td className={TD}>{count(counts.expected)}</td>
            <td className={TD}>{counts.n90.toLocaleString()}</td>
            <td className={TD}>{counts.n99.toLocaleString()}</td>
            {price !== undefined && (
              <>
                <td className={TD}>{neso(counts.expected * price)}</td>
                <td className={TD}>{neso(counts.n90 * price)}</td>
                <td className={TD}>{neso(counts.n99 * price)}</td>
              </>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
