// Item IDs for price lookups (GET /api/enhancement/{itemId}, see src/lib/enhancement.ts).
// Other items are found by name with GET /api/items/search (src/lib/itemSearch.ts, ItemPicker).

/** Cubes, as the API names them (/gamemeta/items/{id}). Prices come per equipment item. */
export const CUBES = [
  { id: 2711000, name: "Occult Cube" },
  { id: 2730000, name: "Bonus Occult Cube" },
  { id: 5062009, name: "Red Cube" },
  { id: 5062010, name: "Black Cube" },
  { id: 5062500, name: "Bonus Potential Cube" },
  { id: 5062503, name: "White Cube" },
] as const;

export type CubeId = (typeof CUBES)[number]["id"];
