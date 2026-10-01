"use client";

import { useState } from "react";
import { GRADES, MAX_GRADE, MIN_GRADE, TIER_UP_CUBES } from "@/data/potential";
import { maxTargetGrade, tierUpPlan } from "@/lib/calc/potential/tierUp";
import { Field, gradeLabel, INPUT_CLASS, neso, positive, PriceField, SELECT_CLASS } from "./fields";
import TierUpResult from "./TierUpResult";
import { cubePrice, type PotentialItem } from "./usePotentialItem";

/**
 * Cubes and cost to raise the selected item's (bonus) potential grade. Remount it (key = resetKey)
 * when the item changes so the inputs below start over from the item.
 */
export default function TierUpCalculator({ sel }: { sel: PotentialItem }) {
  const [cubeId, setCubeId] = useState<number>();
  // Unset = follow the item (its current grade) / the cube (as far as it goes) / the API price.
  const [gradeInput, setGradeInput] = useState<number>();
  const [targetInput, setTargetInput] = useState<number>();
  const [priceInput, setPriceInput] = useState<number>();
  const [tries, setTries] = useState<number>();

  const from = gradeInput ?? Math.max(sel.detectedGrade, MIN_GRADE);
  const cubes = TIER_UP_CUBES.filter((c) => c.kind === sel.kind);
  // Until the user picks one: the first cube that can raise the current grade.
  const cube =
    cubes.find((c) => c.id === cubeId) ?? cubes.find((c) => maxTargetGrade(c, from) > from) ?? cubes[0];

  // Only grades the cube can reach are offered, so an unsupported step can't be picked.
  const maxTarget = maxTargetGrade(cube, from);
  const targets = GRADES.filter((g) => g.grade > from && g.grade <= maxTarget);
  const to = targets.some((g) => g.grade === targetInput) ? targetInput! : maxTarget;
  const plan = targets.length > 0 ? tierUpPlan(cube, from, to) : null;

  const { apiPrice, hint } = cubePrice(sel, cube.id);
  const price = priceInput ?? apiPrice;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="큐브">
          <select
            value={cube.id}
            onChange={(e) => {
              setCubeId(Number(e.target.value));
              setPriceInput(undefined);
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

        <Field label="현재 등급">
          <select value={from} onChange={(e) => setGradeInput(Number(e.target.value))} className={SELECT_CLASS}>
            {GRADES.map((g) => (
              <option key={g.grade} value={g.grade}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="목표 등급">
          <select
            value={plan ? to : ""}
            disabled={!plan}
            onChange={(e) => setTargetInput(Number(e.target.value))}
            className={`${SELECT_CLASS} disabled:opacity-50`}
          >
            {!plan && <option value="">선택할 수 없음</option>}
            {targets.map((g) => (
              <option key={g.grade} value={g.grade}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>

        <PriceField value={priceInput} apiPrice={apiPrice} hint={hint} onChange={setPriceInput} />
      </div>

      {plan ? (
        <>
          <TierUpResult plan={plan} price={price} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>큐브</span>
            <input
              type="number"
              inputMode="numeric"
              aria-label="사용할 큐브 개수"
              min={0}
              step={1}
              value={tries ?? ""}
              placeholder={String(plan.total.n90)}
              onChange={(e) => {
                const v = positive(e.target.value);
                setTries(v === undefined ? undefined : Math.floor(v));
              }}
              className={`${INPUT_CLASS} !w-24`}
            />
            <span>
              개 안에 {gradeLabel(to)} 등급이 될 확률:{" "}
              <strong className="tabular-nums">
                {(plan.within(tries ?? plan.total.n90) * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%
              </strong>
              {price !== undefined && (
                <span className="text-zinc-500"> (비용 {neso((tries ?? plan.total.n90) * price)} NESO)</span>
              )}
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          {from >= MAX_GRADE
            ? "이미 최고 등급(레전드리)입니다."
            : `${cube.name}로는 ${gradeLabel(from)} 등급에서 더 올릴 수 없습니다. 다른 큐브를 고르세요.`}
        </p>
      )}
    </div>
  );
}
