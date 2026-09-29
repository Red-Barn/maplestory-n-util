import type { ItemDetail, ItemSet } from "@/types/msu";
import { parseOption } from "../parseOption";
import type { StatContribution } from "../types";

/** Equipped piece count per setId (non-mintable items have no detail, so they can't be counted). */
export function countSetPieces(items: Record<string, ItemDetail | null>): Map<number, number> {
  const counts = new Map<number, number>();
  for (const item of Object.values(items)) {
    const id = item?.common.setItemId;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function collectSets(items: Record<string, ItemDetail | null>, sets: ItemSet[]): StatContribution[] {
  const counts = countSetPieces(items);
  return sets.flatMap((set) => {
    const n = counts.get(set.setId) ?? 0;
    return set.effects
      .filter((e) => e.equipCount <= n)
      .flatMap((e) =>
        e.desc.flatMap((d) =>
          parseOption(d).map((eff) => ({ ...eff, source: "set" as const, label: `${set.setName} ${e.equipCount}세트 (${d})` })),
        ),
      );
  });
}
