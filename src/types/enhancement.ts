// Enhancement prices of one equipment item, in NESO. Safe to import from client code.

export type EnhancementPrices = {
  itemId: number;
  /** Price of one attempt at each star: key n = n ★ → n+1 ★. 0 means that star isn't offered. */
  starforce: Record<number, number>;
  /** Price of one use of each cube on this item, by cube item ID (see CUBES in src/data/itemIds.ts). */
  cubes: Record<number, number>;
  /** When the current prices were set (they move every minute). */
  asOf?: string;
};
