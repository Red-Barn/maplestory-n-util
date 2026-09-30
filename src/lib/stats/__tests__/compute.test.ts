import { describe, expect, test } from "vitest";
import { LINK_SKILLS } from "@/data/links";
import { COLLECTION } from "@/data/collection";
import { MISC_ITEMS, TITLES } from "@/data/miscItems";
import {
  apStatToFinal,
  collectCharacter,
  collectChoices,
  collectCollectionSet,
  collectPresets,
  collectUnion,
  collectUnionGrid,
  computeStats,
  defaultChoiceInput,
  defaultPresetInput,
} from "..";
import { collectSets, countSetPieces } from "../collectors/sets";
import { redBarn } from "./fixtures";

const c = collectCharacter(redBarn);
const defaultBuffs = c.buffs.filter((b) => b.defaultOn).flatMap((b) => b.contributions);
const base = [...c.permanent, ...defaultBuffs];
const api = apStatToFinal(redBarn.character.apStat);
const buff = (id: string) => c.buffs.find((b) => b.id === id)!;

describe("RedBarn (Bowmaster Lv.244)", () => {
  test("detects job and learned buffs", () => {
    expect(c.job?.name).toBe("Bowmaster");
    expect(c.buffs.map((b) => b.id)).toEqual(["season-tonic", "echo-of-hero", "maple-warrior", "sharp-eyes"]);
  });

  test("only the season buff is on by default (the API snapshot includes it, not skill buffs)", () => {
    expect(c.buffs.filter((b) => b.defaultOn).map((b) => b.id)).toEqual(["season-tonic"]);
  });

  test("final damage matches in-game exactly (multiplicative)", () => {
    expect(computeStats(base, c.ap).final["FD%"]).toBe(api["FD%"]);
  });

  test("lucky hat (Chaos Queen's Tiara) joins equipment sets with 3+ pieces only", () => {
    const { counts, luckyIn } = countSetPieces(redBarn.items);
    expect(counts.get(249)).toBe(4); // Root Abyss: 3 + lucky
    expect(counts.get(506)).toBe(5); // AbsoLab: 4 + lucky
    expect(counts.get(462)).toBe(9); // Boss accessories: accessory set, no lucky
    expect(counts.get(584)).toBe(2); // Seven Days: accessory set, no lucky
    expect([...luckyIn.keys()].sort()).toEqual([249, 506]);
  });

  test("set effects apply by equipped piece count", () => {
    const tiers = new Set(
      collectSets(redBarn.items, redBarn.sets).map((x) => x.label.replace(/ \[.*?\]/, "").match(/^.*?\d+세트/)![0]),
    );
    expect(tiers).toEqual(
      new Set([
        "Root Abyss Set (Bowman) 2세트",
        "Root Abyss Set (Bowman) 3세트",
        "Root Abyss Set (Bowman) 4세트",
        "Boss Accessory Set 3세트",
        "Boss Accessory Set 5세트",
        "Boss Accessory Set 7세트",
        "Boss Accessory Set 9세트",
        "AbsoLab Set (Bowman) 2세트",
        "AbsoLab Set (Bowman) 3세트",
        "AbsoLab Set (Bowman) 4세트",
        "AbsoLab Set (Bowman) 5세트",
        // medal (metadata only) + badge
        "Seven Days Set 2세트",
      ]),
    );
  });

  test("special ring (not in the API) adds all stats +4 and ATT/MATT +4", () => {
    const ring = c.permanent.filter((x) => x.label.startsWith("S.Ring")).map((x) => `${x.stat}=${x.value}`);
    expect(ring.sort()).toEqual(["ATT=4", "DEX=4", "INT=4", "LUK=4", "MATT=4", "STR=4"]);
  });

  test("Marksmanship gives IED 25% and ATT 25%", () => {
    const m = c.permanent.filter((x) => x.label.startsWith("Marksmanship")).map((x) => `${x.stat}=${x.value}`);
    expect(m).toEqual(["IED%=25", "ATT%=25"]);
  });

  test("main stat AP is 5 × level + 18", () => {
    expect(c.ap.DEX).toBe(1238);
    expect(c.ap.STR).toBe(4);
  });

  test("non-mintable items count via metadata, plus known extra effects", () => {
    const of = (name: string) =>
      c.permanent.filter((x) => x.label.startsWith(name)).map((x) => `${x.stat}=${x.value}`).sort();
    expect(of("Pivotal Adventure Ring")).toEqual(
      ["ATT=3", "CDMG%=3", "CRIT%=15", "DEX=3", "HP=300", "INT=3", "LUK=3", "MATT=3", "MP=300", "STR=3"].sort(),
    );
    expect(of("Seven Day Monster Parker")).toEqual(
      ["ATT=7", "DEX=7", "IED%=10", "INT=7", "LUK=7", "MATT=7", "STR=7"].sort(),
    );
  });

  test("toggling a skill buff adds its effect on top", () => {
    const t = computeStats(base, c.ap).totals;
    const on = computeStats([...base, ...buff("echo-of-hero").contributions], c.ap).final.ATT;
    expect(on).toBe(Math.floor(t.ATT! * (1 + (t["ATT%"]! + 4) / 100)));

    const se = computeStats([...base, ...buff("sharp-eyes").contributions], c.ap).final;
    expect(se["CRIT%"] - computeStats(base, c.ap).final["CRIT%"]).toBe(25);
  });

  test("season buff can be switched off", () => {
    const off = computeStats(c.permanent, c.ap).final;
    const on = computeStats(base, c.ap).final;
    expect(on["BOSS%"] - off["BOSS%"]).toBe(15);
    expect(on["CRIT%"] - off["CRIT%"]).toBe(15);
  });
});

describe("user inputs", () => {
  test("union adds %-unaffected stat one-for-one", () => {
    const before = computeStats(base, c.ap).final;
    const after = computeStats([...base, ...collectUnion({ DEX: 500, STR: 200 })], c.ap).final;
    expect(after.DEX - before.DEX).toBe(500);
    expect(after.STR - before.STR).toBe(200);
  });

  test("union raider crit rate / crit damage add directly", () => {
    const got = collectUnion({ "CRIT%": 4, "CDMG%": 6 }).map((x) => `${x.stat}=${x.value}`);
    expect(got).toEqual(["CRIT%=4", "CDMG%=6"]);
  });

});

describe("pets", () => {
  test("3 pets + 3 pet equips = ATT & Magic ATT +30 +15", () => {
    const pets = c.permanent.filter((x) => x.source === "pet");
    expect(pets.filter((x) => x.stat === "ATT").map((x) => `${x.label}=${x.value}`)).toEqual(["펫 3마리=30", "펫장비 3개=15"]);
    expect(pets.filter((x) => x.stat === "MATT").reduce((a, x) => a + x.value, 0)).toBe(45);
  });
});

const statsOf = (list: { stat: string; value: number }[]) => list.map((x) => `${x.stat}=${x.value}`);
const sumOf = (list: { stat: string; value: number }[], k: string) =>
  list.filter((x) => x.stat === k).reduce((a, x) => a + x.value, 0);

describe("collection tiers", () => {
  test("none by default", () => {
    expect(collectChoices(COLLECTION, defaultChoiceInput(COLLECTION), "collection")).toEqual([]);
  });

  test("tier 12", () => {
    const got = collectChoices(COLLECTION, { collection: "12" }, "collection");
    expect(statsOf(got)).toEqual([
      "STR=500",
      "DEX=500",
      "INT=500",
      "LUK=500",
      "ATT=50",
      "MATT=50",
      "DMG%=25",
      "BOSS%=25",
      "CDMG%=25",
      "IED%=38",
      "CRIT%=38",
    ]);
  });

  test("set effect all stats", () => {
    expect(statsOf(collectCollectionSet(30))).toEqual(["STR=30", "DEX=30", "INT=30", "LUK=30"]);
    expect(collectCollectionSet(undefined)).toEqual([]);
  });

  test("tier 1 and tier 2 values", () => {
    const t1 = collectChoices(COLLECTION, { collection: "1" }, "collection");
    expect([sumOf(t1, "DEX"), sumOf(t1, "ATT"), sumOf(t1, "BOSS%"), sumOf(t1, "CRIT%")]).toEqual([40, 4, 2, 2]);
    const t2 = collectChoices(COLLECTION, { collection: "2" }, "collection");
    expect([sumOf(t2, "DEX"), sumOf(t2, "ATT"), sumOf(t2, "CDMG%"), sumOf(t2, "IED%")]).toEqual([80, 8, 4, 6]);
  });
});

describe("title and arrows", () => {
  test("default title is Holy Pink Beanity", () => {
    const got = collectChoices(TITLES, defaultChoiceInput(TITLES), "misc-item");
    expect(statsOf(got)).toEqual(["STR=10", "DEX=10", "INT=10", "LUK=10", "ATT=5", "MATT=5", "BOSS%=10"]);
  });

  test("Chaos Vellum Crusher, or no title", () => {
    expect(statsOf(collectChoices(TITLES, { title: "chaos-vellum-crusher" }, "misc-item"))).toEqual(["BOSS%=5"]);
    expect(collectChoices(TITLES, { title: "" }, "misc-item")).toEqual([]);
  });

  test("arrows", () => {
    expect(statsOf(collectPresets(MISC_ITEMS, defaultPresetInput(MISC_ITEMS), "misc-item"))).toEqual(["ATT=9"]);
  });
});

describe("link skills and union grid", () => {
  test("default link levels", () => {
    const got = collectChoices(LINK_SKILLS, defaultChoiceInput(LINK_SKILLS), "link");
    expect(sumOf(got, "CRIT%")).toBe(25); // 궁수 Lv.6 10 + 팬텀 Lv.2 15
    expect(sumOf(got, "IED%")).toBe(25); // 루미너스 Lv.2 15 + 호영 Lv.2 10 (raw; multiplicative in computeStats)
    expect(sumOf(got, "ATT")).toBe(25); // 시그너스 Lv.10
    expect(sumOf(got, "DEX")).toBe(70); // 해적 Lv.6
    expect(sumOf(got, "BOSS%")).toBe(4);
    expect(sumOf(got, "DMG%")).toBe(2);
  });

  test("Lv.0 gives nothing, Lv.6 bowman gives crit rate 10%", () => {
    const bowman = LINK_SKILLS.filter((d) => d.id === "bowman");
    expect(collectChoices(bowman, { bowman: "" }, "link")).toEqual([]);
    expect(statsOf(collectChoices(bowman, { bowman: "6" }, "link"))).toEqual(["CRIT%=10"]);
    expect(bowman[0].options.map((o) => o.label)).toEqual(["Lv.1", "Lv.2", "Lv.3", "Lv.4", "Lv.5", "Lv.6"]);
  });

  test("other levels, and not owned", () => {
    const input = { ...defaultChoiceInput(LINK_SKILLS), bowman: "", adele: "1", cygnus: "3", pirate: "1" };
    const got = collectChoices(LINK_SKILLS, input, "link");
    expect(got.some((x) => x.label.startsWith("모험가 궁수"))).toBe(false);
    expect(statsOf(got.filter((x) => x.label.startsWith("아델")))).toEqual(["BOSS%=2", "DMG%=1"]);
    expect(sumOf(got, "ATT")).toBe(11);
    expect(sumOf(got, "LUK")).toBe(20);
  });

  test("union grid cells", () => {
    const got = collectUnionGrid({ DEX: 10, STR: 4, ATT: 15, "CDMG%": 7, "IED%": 40 }).map((x) => `${x.stat}=${x.value}`);
    expect(got).toEqual(["DEX=50", "STR=20", "ATT=15", "CDMG%=3.5", "IED%=40"]);
  });
});

test("stat % totals used by the stat panel", () => {
  const t = computeStats(c.permanent, c.ap).totals;
  expect(t["DEX%"]).toBeGreaterThan(0);
  expect(t["ALL%"]).toBeGreaterThan(0);
  expect(t["ATT%"]).toBeGreaterThan(0);
});
