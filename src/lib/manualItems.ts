import type { ItemDetail } from "@/types/msu";
import { itemFromMetadata } from "./itemMeta";

/** Equipment slot key for the special (skill) ring, which the API doesn't return. */
export const SPECIAL_RING_SLOT = "sRing";

// Every special ring gives all stats +4 and ATT / Magic ATT +4 (confirmed in-game by the user).
const SPECIAL_RING: ItemDetail = {
  ...itemFromMetadata({
    category: {
      categoryNo: 0,
      label: "Item > Armor > Accessory > Ring",
      tier2: { code: "02", label: "Accessory" },
      tier3: { code: "004", label: "Ring" },
    },
    common: { itemId: 0, itemName: "S.Ring (특수 반지)", maxStarforce: 0, setItemId: 0 },
    image: { iconImageUrl: "" },
    required: { level: 0 },
    stats: { str: 4, dex: 4, int: 4, luk: 4, pad: 4, mad: 4 },
  }),
  fromMetadata: false,
  manual: true,
};

/** Adds equipment the API never returns, so stats and the equipment grid both include it. */
export function withManualItems(items: Record<string, ItemDetail | null>): Record<string, ItemDetail | null> {
  return { ...items, [SPECIAL_RING_SLOT]: SPECIAL_RING };
}

/** For characters that don't wear a special ring (the user unchecks it on the character page). */
export function withoutSpecialRing(items: Record<string, ItemDetail | null>): Record<string, ItemDetail | null> {
  return Object.fromEntries(Object.entries(items).filter(([slot]) => slot !== SPECIAL_RING_SLOT));
}
