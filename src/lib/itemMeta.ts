import type { Category, ItemDetail, ItemStats, StatBreakdown } from "@/types/msu";

/** GET /gamemeta/items/{itemId} → data.item (stats are plain numbers, base values only) */
export type ItemMetadata = {
  category: Category;
  common: { itemId: number; itemName: string; maxStarforce: number; setItemId: number };
  image: { iconImageUrl: string };
  required: { level: number };
  stats: Record<string, number>;
};

const BREAKDOWN_FIELDS = [
  "str", "dex", "int", "luk", "maxHp", "maxMp", "pad", "mad",
  "bdr", "damr", "imdr", "statr", "pdd", "speed", "jump", "maxHpr", "maxMpr",
] as const;

const base = (n = 0): StatBreakdown => ({ base: n, enhance: 0, extra: 0, total: n });

/**
 * Non-mintable items (e.g. medals, event rings) have no /items/{assetKey} detail. Their game
 * metadata carries the base stats and set id, which is all they have — they can't be enhanced.
 */
export function itemFromMetadata(meta: ItemMetadata): ItemDetail {
  const stats = Object.fromEntries(BREAKDOWN_FIELDS.map((f) => [f, base(meta.stats[f])])) as unknown as ItemStats;
  stats.attackSpeed = meta.stats.attackSpeed ?? 0;
  return {
    fromMetadata: true,
    assetKey: "",
    name: meta.common.itemName,
    category: meta.category,
    common: meta.common,
    enhance: { potential: null, bonusPotential: null, starforce: { enhanced: 0, maxStarforce: 0 } },
    image: meta.image,
    required: meta.required,
    stats,
  };
}
