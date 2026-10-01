// Item lookup results. Safe to import from client code.

/** An item found by name (GET /api/items/search). */
export type ItemRef = {
  id: number;
  name: string;
  /** e.g. 1000102007: tier 1 "01" = weapon, "02" = armor & accessories */
  categoryNo: number;
};

/** One item's game metadata (GET /api/items/{itemId}). */
export type ItemInfo = {
  id: number;
  name: string;
  iconUrl: string;
  requiredLevel: number;
  /** 0 when the item can't be star forced */
  maxStarforce: number;
  /** e.g. "Item > Weapon > Two-handed Weapon > Bow", plus its last two tiers */
  category: { label: string; tier2?: string; tier3?: string };
};
