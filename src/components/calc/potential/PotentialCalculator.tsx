"use client";

import { useEffect, useState, type ReactNode } from "react";
import { GRADES, MIN_GRADE, POTENTIAL_KINDS, TIER_UP_CUBES, type PotentialKind } from "@/data/potential";
import ItemPicker from "@/components/ItemPicker";
import { maxTargetGrade, potentialGrade, tierUpPlan } from "@/lib/calc/potential/tierUp";
import type { EnhancementPrices } from "@/types/enhancement";
import type { ItemRef } from "@/types/items";
import type { ItemDetail } from "@/types/msu";
import TierUpResult from "./TierUpResult";

// Equip slots in the order of the equipment grid (EquipmentGrid keeps its own copy).
const SLOTS: [string, string][] = [
  ["weapon", "무기"],
  ["subWeapon", "보조무기"],
  ["emblem", "엠블렘"],
  ["cap", "모자"],
  ["clothes", "상의"],
  ["pants", "하의"],
  ["shoes", "신발"],
  ["gloves", "장갑"],
  ["cape", "망토"],
  ["shoulder", "어깨장식"],
  ["belt", "벨트"],
  ["faceAcc", "얼굴장식"],
  ["eyeAcc", "눈장식"],
  ["earAcc", "귀고리"],
  ["pendant1", "펜던트"],
  ["pendant2", "펜던트2"],
  ["ring1", "반지1"],
  ["ring2", "반지2"],
  ["ring3", "반지3"],
  ["ring4", "반지4"],
  ["pocket", "포켓"],
  ["badge", "뱃지"],
];

const SELECT_CLASS =
  "w-full rounded border border-black/15 bg-[var(--background)] px-1.5 py-1 text-sm focus:border-orange-500 focus:outline-none dark:border-white/20";
const INPUT_CLASS =
  "w-full rounded border border-black/15 bg-transparent px-1.5 py-1 text-right text-sm tabular-nums focus:border-orange-500 focus:outline-none dark:border-white/20";

type PriceState = { itemId: number; data?: EnhancementPrices; error?: string };

/** Where the item comes from: the character's equipment, or any item found by name. */
type Source = "equipped" | "name";

const SOURCES: { source: Source; label: string }[] = [
  { source: "equipped", label: "장착 장비" },
  { source: "name", label: "아이템 이름으로 찾기" },
];

const gradeLabel = (grade: number) => GRADES.find((g) => g.grade === grade)?.label ?? "없음";
const neso = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 6 });
const positive = (raw: string) => {
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? v : undefined;
};

/** A labelled control. `group` renders a div instead of a label (for controls with several inputs/buttons). */
function Field(props: { label: string; hint?: ReactNode; group?: boolean; children: ReactNode }) {
  const Tag = props.group ? "div" : "label";
  return (
    <Tag className="block space-y-1">
      <span className="block text-xs font-medium text-zinc-500">{props.label}</span>
      {props.children}
      {props.hint && <span className="block text-[11px] leading-snug text-zinc-500">{props.hint}</span>}
    </Tag>
  );
}

/**
 * Potential tier-up calculator: cubes and cost to raise an item's (bonus) potential grade. The item
 * is one the character has equipped (grade read from it) or any item found by name (grade entered).
 */
export default function PotentialCalculator({ items }: { items: Record<string, ItemDetail | null> }) {
  // Items that can hold a potential: metadata-only and manually added ones can't be enhanced.
  const equipped = SLOTS.flatMap(([slot, label]) => {
    const item = items[slot];
    return item && !item.fromMetadata && !item.manual ? [{ slot, label, item }] : [];
  });

  const [source, setSource] = useState<Source>(equipped.length > 0 ? "equipped" : "name");
  const [slot, setSlot] = useState(equipped[0]?.slot ?? "");
  const [picked, setPicked] = useState<ItemRef>();
  const [kind, setKind] = useState<PotentialKind>("potential");
  const [cubeId, setCubeId] = useState<number>();
  // Unset = follow the item (its current grade) / the cube (as far as it goes) / the API price.
  const [gradeInput, setGradeInput] = useState<number>();
  const [targetInput, setTargetInput] = useState<number>();
  const [priceInput, setPriceInput] = useState<number>();
  const [tries, setTries] = useState<number>();
  const [prices, setPrices] = useState<PriceState>();

  const item = source === "equipped" ? equipped.find((e) => e.slot === slot)?.item : undefined;
  const itemId = source === "equipped" ? item?.common.itemId : picked?.id;

  useEffect(() => {
    if (!itemId) return;
    let stale = false;
    fetch(`/api/enhancement/${itemId}`)
      .then(async (res) => {
        const body = await res.json();
        if (stale) return;
        setPrices(res.ok ? { itemId, data: body } : { itemId, error: body.error ?? "가격을 불러오지 못했습니다." });
      })
      .catch(() => {
        if (!stale) setPrices({ itemId, error: "가격을 불러오지 못했습니다." });
      });
    return () => {
      stale = true;
    };
  }, [itemId]);

  const detected = item ? potentialGrade(kind === "potential" ? item.enhance.potential : item.enhance.bonusPotential) : 0;
  const from = gradeInput ?? Math.max(detected, MIN_GRADE);

  const cubes = TIER_UP_CUBES.filter((c) => c.kind === kind);
  // Until the user picks one: the first cube that can raise the current grade.
  const cube =
    cubes.find((c) => c.id === cubeId) ?? cubes.find((c) => maxTargetGrade(c, from) > from) ?? cubes[0];

  // Only grades the cube can reach are offered, so an unsupported step can't be picked.
  const maxTarget = maxTargetGrade(cube, from);
  const targets = GRADES.filter((g) => g.grade > from && g.grade <= maxTarget);
  const to = targets.some((g) => g.grade === targetInput) ? targetInput! : maxTarget;
  const plan = targets.length > 0 ? tierUpPlan(cube, from, to) : null;

  const loaded = prices?.itemId === itemId ? prices : undefined;
  const apiPrice = loaded?.data?.cubes[cube.id] || undefined; // 0 = not offered for this item
  const price = priceInput ?? apiPrice;
  const kindLabel = POTENTIAL_KINDS.find((k) => k.kind === kind)!.label;

  let priceHint: ReactNode;
  if (!itemId) priceHint = "아이템을 고르면 현재 시세를 불러옵니다.";
  else if (!loaded) priceHint = "시세를 불러오는 중…";
  // items without a market price come back as an API NotFound — not worth showing verbatim
  else if (loaded.error) priceHint = "이 장비의 큐브 시세를 불러오지 못했습니다. 가격을 직접 입력하세요.";
  else if (apiPrice === undefined) priceHint = "이 장비에는 이 큐브의 시세가 없습니다. 가격을 직접 입력하세요.";
  else
    priceHint = (
      <>
        현재 시세 {neso(apiPrice)} NESO
        {loaded.data?.asOf && ` (${new Date(loaded.data.asOf).toLocaleTimeString()} 기준)`}. 비워 두면 시세로 계산합니다.
      </>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-black/10 dark:border-white/15" role="tablist">
        {SOURCES.map((s) => (
          <button
            key={s.source}
            type="button"
            role="tab"
            aria-selected={source === s.source}
            onClick={() => {
              setSource(s.source);
              setGradeInput(undefined);
              setPriceInput(undefined);
            }}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium ${
              source === s.source ? "border-orange-500 text-current" : "border-transparent text-zinc-500 hover:text-current"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {source === "equipped" ? (
          <Field label="장비" hint="가격은 장비마다 다르고 1분마다 바뀝니다.">
            {equipped.length > 0 ? (
              <select
                value={slot}
                onChange={(e) => {
                  setSlot(e.target.value);
                  setGradeInput(undefined);
                  setPriceInput(undefined);
                }}
                className={SELECT_CLASS}
              >
                {equipped.map((e) => (
                  <option key={e.slot} value={e.slot}>
                    {e.label} · {e.item.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="block text-sm text-zinc-500">잠재능력을 가진 장착 장비가 없습니다.</span>
            )}
          </Field>
        ) : (
          <Field
            label="아이템"
            group
            hint={
              picked
                ? `${picked.name} (ID ${picked.id}). 등급은 직접 고르세요.`
                : "장비 이름 일부를 영문으로 입력하세요. 고르지 않으면 가격을 직접 입력해 계산합니다."
            }
          >
            <ItemPicker
              onSelect={(found) => {
                setPicked(found);
                setGradeInput(undefined);
                setPriceInput(undefined);
              }}
            />
          </Field>
        )}

        <Field label="종류">
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as PotentialKind);
              setCubeId(undefined);
              setGradeInput(undefined);
              setPriceInput(undefined);
            }}
            className={SELECT_CLASS}
          >
            {POTENTIAL_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>

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

        <Field
          label="현재 등급"
          hint={
            item &&
            (detected >= MIN_GRADE
              ? `이 장비의 ${kindLabel}: ${gradeLabel(detected)}`
              : `이 장비에는 ${kindLabel}이 없습니다. 등급을 직접 고르세요.`)
          }
        >
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

        <Field label="큐브 1개 가격 (NESO)" hint={priceHint}>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={priceInput ?? ""}
            placeholder={apiPrice !== undefined ? String(apiPrice) : "직접 입력"}
            onChange={(e) => setPriceInput(positive(e.target.value))}
            className={INPUT_CLASS}
          />
        </Field>
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
          {from >= GRADES[GRADES.length - 1].grade
            ? "이미 최고 등급(레전드리)입니다."
            : `${cube.name}로는 ${gradeLabel(from)} 등급에서 더 올릴 수 없습니다. 다른 큐브를 고르세요.`}
        </p>
      )}
    </div>
  );
}
