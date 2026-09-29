import { LUCKY_ITEMS, LUCKY_MIN_PIECES } from "@/data/luckyItems";
import type { ItemDetail, ItemSet } from "@/types/msu";
import { parseOption } from "../parseOption";
import type { StatContribution } from "../types";

export type SetCounts = {
  /** equipped piece count per setId, including the lucky item where it applies */
  counts: Map<number, number>;
  /** name of the lucky item per setId it was added to */
  luckyIn: Map<number, string>;
};

const isAccessory = (item: ItemDetail) => item.category.tier2?.label === "Accessory";

/**
 * A lucky item (only one can be worn — they're all hats) adds one piece to every equipment set
 * that already has LUCKY_MIN_PIECES pieces, except a set it belongs to itself. Sets whose equipped
 * pieces are all accessories (Item > Armor > Accessory) don't get it.
 */
export function countSetPieces(items: Record<string, ItemDetail | null>): SetCounts {
  const equipped = Object.values(items).filter((i): i is ItemDetail => i != null);
  const counts = new Map<number, number>();
  const equipmentSets = new Set<number>();
  for (const item of equipped) {
    const id = item.common.setItemId;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (!isAccessory(item)) equipmentSets.add(id);
  }
  const luckyIn = new Map<number, string>();
  const lucky = equipped.find((i) => LUCKY_ITEMS.has(i.name));
  if (lucky) {
    for (const [id, n] of counts) {
      if (id === lucky.common.setItemId || n < LUCKY_MIN_PIECES || !equipmentSets.has(id)) continue;
      counts.set(id, n + 1);
      luckyIn.set(id, lucky.name);
    }
  }
  return { counts, luckyIn };
}

export function collectSets(items: Record<string, ItemDetail | null>, sets: ItemSet[]): StatContribution[] {
  const { counts, luckyIn } = countSetPieces(items);
  return sets.flatMap((set) => {
    const n = counts.get(set.setId) ?? 0;
    const lucky = luckyIn.get(set.setId);
    const name = lucky ? `${set.setName} [${n}세트, 럭키: ${lucky}]` : set.setName;
    return set.effects
      .filter((e) => e.equipCount <= n)
      .flatMap((e) =>
        e.desc.flatMap((d) =>
          parseOption(d).map((eff) => ({ ...eff, source: "set" as const, label: `${name} ${e.equipCount}세트 (${d})` })),
        ),
      );
  });
}
