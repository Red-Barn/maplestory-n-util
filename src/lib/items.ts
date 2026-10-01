import type { ItemMetadata } from "@/lib/itemMeta";
import type { ItemInfo, ItemRef } from "@/types/items";

// Pure helpers for item lookups (the API calls are in itemSearch.ts, which is server-only).

/** One entry of GET /search/suggest?type=item */
export type ItemSuggestion = {
  keyword: string;
  keywordId?: string;
  itemExtra?: { itemId: number; categoryNo: number };
};

export const MIN_QUERY_LENGTH = 2;

/** Item icon by ID (same CDN the API uses). */
export const itemIconUrl = (id: number) => `https://api-static.msu.io/itemimages/icon/${id}.png`;

/**
 * Category numbers read tier0 "100" + tier1 + tier2 + tier3 (e.g. 1000102007). Tier 1 "01" is
 * weapons and "02" armor & accessories — the items star force and potentials apply to. Cosmetics
 * ("03") and utility items like pets ("04") are not equipment in that sense.
 */
export function isEquipmentCategory(categoryNo: number): boolean {
  const tier1 = Math.floor(categoryNo / 100000) % 100;
  return tier1 === 1 || tier1 === 2;
}

/**
 * Suggestions → items: drops duplicates (same ID) and, with `equipmentOnly`, non-equipment.
 * Names starting with the query come first; otherwise the API's order is kept.
 * Different items with the same name are all kept (they have different IDs).
 */
export function toItemRefs(
  suggestions: ItemSuggestion[],
  query: string,
  { equipmentOnly = false, limit = 20 }: { equipmentOnly?: boolean; limit?: number } = {},
): ItemRef[] {
  const seen = new Set<number>();
  const items: ItemRef[] = [];
  for (const s of suggestions) {
    const id = s.itemExtra?.itemId ?? Number(s.keywordId);
    if (!id || seen.has(id)) continue;
    const categoryNo = s.itemExtra?.categoryNo ?? 0;
    if (equipmentOnly && !isEquipmentCategory(categoryNo)) continue;
    seen.add(id);
    items.push({ id, name: s.keyword, categoryNo });
  }
  const q = query.trim().toLowerCase();
  const starts = (item: ItemRef) => (item.name.toLowerCase().startsWith(q) ? 0 : 1);
  // Array.prototype.sort is stable, so ties keep the API order
  return items.sort((a, b) => starts(a) - starts(b)).slice(0, limit);
}

export function toItemInfo(meta: ItemMetadata): ItemInfo {
  return {
    id: meta.common.itemId,
    name: meta.common.itemName,
    iconUrl: meta.image.iconImageUrl || itemIconUrl(meta.common.itemId),
    requiredLevel: meta.required.level,
    maxStarforce: meta.common.maxStarforce,
    category: { label: meta.category.label, tier2: meta.category.tier2?.label, tier3: meta.category.tier3?.label },
  };
}
