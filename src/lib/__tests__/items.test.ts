import { describe, expect, test } from "vitest";
import { isEquipmentCategory, itemIconUrl, toItemInfo, toItemRefs, type ItemSuggestion } from "@/lib/items";
import type { ItemMetadata } from "@/lib/itemMeta";

// Shapes taken from real GET /search/suggest?type=item responses
const s = (name: string, itemId: number, categoryNo: number): ItemSuggestion => ({
  keyword: name,
  keywordId: String(itemId),
  itemExtra: { itemId, categoryNo },
});

const SUGGESTIONS = [
  s("Bloody Guardian Hood", 1000091, 1000301001), // cosmetic hat
  s("AbsoLab Archer Hood", 1004424, 1000201001), // hat
  s("Fafnir Wind Chaser", 1452205, 1000102007), // bow
  s("Arcane Umbra Two-Handed Hammer", 1422140, 1000102003),
  s("Pinkadillo", 5000500, 1000401001), // pet
  s("AbsoLab Archer Hood", 1004424, 1000201001), // same item twice
  s("AbsoLab Archer Hood", 1009999, 1000201001), // same name, different item
];

describe("item search results", () => {
  test("equipment = weapons (tier 1 01) and armor & accessories (02)", () => {
    expect([1000102007, 1000201001, 1000202007].map(isEquipmentCategory)).toEqual([true, true, true]);
    expect([1000301001, 1000401001].map(isEquipmentCategory)).toEqual([false, false]);
  });

  test("equipment only, duplicates dropped, same-name items kept", () => {
    const got = toItemRefs(SUGGESTIONS, "ar", { equipmentOnly: true });
    expect(got.map((i) => i.id)).toEqual([1422140, 1004424, 1452205, 1009999]);
  });

  test("names starting with the query come first, otherwise the API order", () => {
    expect(toItemRefs(SUGGESTIONS, "AR", { equipmentOnly: true })[0].name).toBe("Arcane Umbra Two-Handed Hammer");
    expect(toItemRefs(SUGGESTIONS, "fafnir").map((i) => i.name)).toEqual([
      "Fafnir Wind Chaser",
      "Bloody Guardian Hood",
      "AbsoLab Archer Hood",
      "Arcane Umbra Two-Handed Hammer",
      "Pinkadillo",
      "AbsoLab Archer Hood",
    ]);
  });

  test("limit, and suggestions without itemExtra use keywordId", () => {
    expect(toItemRefs(SUGGESTIONS, "a", { limit: 2 })).toHaveLength(2);
    expect(toItemRefs([{ keyword: "Red Cube", keywordId: "5062009" }], "red")).toEqual([
      { id: 5062009, name: "Red Cube", categoryNo: 0 },
    ]);
  });
});

test("item metadata → item info", () => {
  const meta: ItemMetadata = {
    category: {
      categoryNo: 1000102007,
      label: "Item > Weapon > Two-handed Weapon > Bow",
      tier2: { code: "02", label: "Two-handed Weapon" },
      tier3: { code: "007", label: "Bow" },
    },
    common: { itemId: 1452205, itemName: "Fafnir Wind Chaser", maxStarforce: 22, setItemId: 0 },
    image: { iconImageUrl: "" },
    required: { level: 150 },
    stats: {},
  };
  expect(toItemInfo(meta)).toEqual({
    id: 1452205,
    name: "Fafnir Wind Chaser",
    iconUrl: itemIconUrl(1452205),
    requiredLevel: 150,
    maxStarforce: 22,
    category: { label: "Item > Weapon > Two-handed Weapon > Bow", tier2: "Two-handed Weapon", tier3: "Bow" },
  });
});
