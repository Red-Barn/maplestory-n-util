import "server-only";

import type { ItemMetadata } from "@/lib/itemMeta";
import { assertItemId } from "@/lib/enhancement";
import { MIN_QUERY_LENGTH, toItemInfo, toItemRefs, type ItemSuggestion } from "@/lib/items";
import { MsuApiError, msuFetch } from "@/lib/msu";
import type { ItemInfo, ItemRef } from "@/types/items";

// Item names change only with game updates, so a day of caching is fine and keeps repeated
// searches from spending the API quota (2 RPS / 3,000 RPD).
const ITEM_REVALIDATE = 86400;
// Ask for more than we show: cosmetics and pets share names with equipment and get filtered out.
const SUGGEST_SIZE = 200;
const MAX_QUERY_LENGTH = 50;

/** Items whose name contains `query` (case-insensitive), via the API's search suggestions. */
export async function searchItems(
  query: string,
  options: { equipmentOnly?: boolean; limit?: number } = {},
): Promise<ItemRef[]> {
  const keyword = query.trim();
  if (keyword.length < MIN_QUERY_LENGTH || keyword.length > MAX_QUERY_LENGTH) {
    throw new MsuApiError(`검색어는 ${MIN_QUERY_LENGTH}~${MAX_QUERY_LENGTH}자로 입력하세요.`, 400);
  }
  const { suggestions } = await msuFetch<{ suggestions: ItemSuggestion[] }>(
    "/search/suggest",
    { type: "item", keyword, size: SUGGEST_SIZE },
    ITEM_REVALIDATE,
  );
  return toItemRefs(suggestions ?? [], keyword, options);
}

/** Name, icon, required level, category and max star force of one item. */
export async function getItemInfo(itemId: number): Promise<ItemInfo> {
  assertItemId(itemId);
  const { item } = await msuFetch<{ item: ItemMetadata }>(`/gamemeta/items/${itemId}`, {}, ITEM_REVALIDATE);
  return toItemInfo(item);
}
