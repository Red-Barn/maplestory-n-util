"use client";

import { useEffect, useState } from "react";
import type { Part, PotentialKind } from "@/data/potential";
import { partOfCategory } from "@/lib/calc/potential/options";
import { potentialGrade } from "@/lib/calc/potential/tierUp";
import type { EnhancementPrices } from "@/types/enhancement";
import type { ItemInfo, ItemRef } from "@/types/items";
import type { ItemDetail } from "@/types/msu";

// The item both potential calculators work on: one the character has equipped, or any item found
// by name. Loads its cube prices (and, for items found by name, its level and category).

/** Equip slots in the order of the equipment grid (EquipmentGrid keeps its own copy). */
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

/** Where the item comes from: the character's equipment, or any item found by name. */
export type Source = "equipped" | "name";

type Loaded<T> = { itemId: number; data?: T; error?: string };

/** GET a JSON route for one item; results are tagged with the item so stale ones can be told apart. */
function useItemFetch<T>(itemId: number | undefined, url: (id: number) => string, error: string) {
  const [state, setState] = useState<Loaded<T>>();
  useEffect(() => {
    if (!itemId) return;
    let stale = false;
    fetch(url(itemId))
      .then(async (res) => {
        const body = await res.json();
        if (!stale) setState(res.ok ? { itemId, data: body } : { itemId, error });
      })
      .catch(() => {
        if (!stale) setState({ itemId, error });
      });
    return () => {
      stale = true;
    };
    // `url` and `error` are constants of the caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);
  return state?.itemId === itemId ? state : undefined;
}

export function usePotentialItem(items: Record<string, ItemDetail | null>) {
  // Items that can hold a potential: metadata-only and manually added ones can't be enhanced.
  const equipped = SLOTS.flatMap(([slot, label]) => {
    const item = items[slot];
    return item && !item.fromMetadata && !item.manual ? [{ slot, label, item }] : [];
  });

  const [source, setSource] = useState<Source>(equipped.length > 0 ? "equipped" : "name");
  const [slot, setSlot] = useState(equipped[0]?.slot ?? "");
  const [picked, setPicked] = useState<ItemRef>();
  const [kind, setKind] = useState<PotentialKind>("potential");

  const item = source === "equipped" ? equipped.find((e) => e.slot === slot)?.item : undefined;
  const itemId = source === "equipped" ? item?.common.itemId : picked?.id;

  // prices move every minute and differ per item; level and category only matter for picked items
  const prices = useItemFetch<EnhancementPrices>(
    itemId,
    (id) => `/api/enhancement/${id}`,
    "이 장비의 큐브 시세를 불러오지 못했습니다.",
  );
  const info = useItemFetch<ItemInfo>(
    source === "name" ? picked?.id : undefined,
    (id) => `/api/items/${id}`,
    "아이템 정보를 불러오지 못했습니다.",
  );

  const detectedGrade = item
    ? potentialGrade(kind === "potential" ? item.enhance.potential : item.enhance.bonusPotential)
    : 0;
  const level = item ? item.required.level : info?.data?.requiredLevel;
  const part: Part | undefined = item
    ? partOfCategory(item.category.tier2.label, item.category.tier3.label)
    : info?.data && partOfCategory(info.data.category.tier2, info.data.category.tier3);

  return {
    equipped,
    source,
    setSource,
    slot,
    setSlot,
    picked,
    setPicked,
    kind,
    setKind,
    item,
    itemId,
    prices,
    detectedGrade,
    level,
    part,
    /** changes whenever the calculators' own inputs should start over */
    resetKey: `${source}:${itemId ?? ""}:${kind}`,
  };
}

export type PotentialItem = ReturnType<typeof usePotentialItem>;

/** Market price of one cube on the item (0 = not offered → undefined), and the hint under the price input. */
export function cubePrice(sel: PotentialItem, cubeId: number): { apiPrice?: number; hint: string } {
  const { itemId, prices } = sel;
  if (!itemId) return { hint: "아이템을 고르면 현재 시세를 불러옵니다." };
  if (!prices) return { hint: "시세를 불러오는 중…" };
  if (prices.error) return { hint: `${prices.error} 가격을 직접 입력하세요.` };
  const apiPrice = prices.data?.cubes[cubeId] || undefined;
  if (apiPrice === undefined) return { hint: "이 장비에는 이 큐브의 시세가 없습니다. 가격을 직접 입력하세요." };
  const asOf = prices.data?.asOf ? ` (${new Date(prices.data.asOf).toLocaleTimeString()} 기준)` : "";
  return {
    apiPrice,
    hint: `현재 시세 ${apiPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })} NESO${asOf}. 비워 두면 시세로 계산합니다.`,
  };
}
