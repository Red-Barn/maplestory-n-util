import { describe, expect, test } from "vitest";
import { LINK_SKILLS } from "@/data/links";
import { MISC_ITEMS } from "@/data/miscItems";
import {
  apStatToFinal,
  collectCharacter,
  collectCollection,
  collectPresets,
  collectUnion,
  collectUnionGrid,
  computeStats,
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

  test("collection expands all stats and ATT/MATT", () => {
    const got = collectCollection({ ALL: 10, ATT: 5, "BOSS%": 3, DEX: 20 }).map((x) => `${x.stat}=${x.value}`);
    expect(got).toEqual(["STR=10", "DEX=10", "INT=10", "LUK=10", "ATT=5", "MATT=5", "BOSS%=3", "DEX=20"]);
  });

  test("collection % stats add directly", () => {
    const before = computeStats(base, c.ap).final;
    const after = computeStats([...base, ...collectCollection({ "DMG%": 27, "CDMG%": 5 })], c.ap).final;
    expect(after["DMG%"] - before["DMG%"]).toBe(27);
    expect(after["CDMG%"] - before["CDMG%"]).toBe(5);
  });
});

describe("pets", () => {
  test("3 pets + 3 pet equips = ATT & Magic ATT +30 +15", () => {
    const pets = c.permanent.filter((x) => x.source === "pet");
    expect(pets.filter((x) => x.stat === "ATT").map((x) => `${x.label}=${x.value}`)).toEqual(["펫 3마리=30", "펫장비 3개=15"]);
    expect(pets.filter((x) => x.stat === "MATT").reduce((a, x) => a + x.value, 0)).toBe(45);
  });
});

describe("title and arrows", () => {
  test("defaults", () => {
    const got = collectPresets(MISC_ITEMS, defaultPresetInput(MISC_ITEMS), "misc-item").map((x) => `${x.stat}=${x.value}`);
    expect(got).toEqual([
      // Holy Pink Beanity
      "STR=10",
      "DEX=10",
      "INT=10",
      "LUK=10",
      "ATT=5",
      "MATT=5",
      "BOSS%=10",
      // Titanium Arrows for Bow
      "ATT=9",
    ]);
  });
});

describe("link skills and union grid", () => {
  test("default link skills", () => {
    const got = collectPresets(LINK_SKILLS, defaultPresetInput(LINK_SKILLS), "link");
    const sum = (k: string) => got.filter((x) => x.stat === k).reduce((a, x) => a + x.value, 0);
    expect(sum("CRIT%")).toBe(25); // 궁수 10 + 팬텀 15
    expect(sum("IED%")).toBe(25); // 루미너스 15 + 호영 10 (raw values; combined multiplicatively in computeStats)
    expect(sum("ATT")).toBe(25);
    expect(sum("MATT")).toBe(25);
    expect(sum("DEX")).toBe(70);
    expect(sum("BOSS%")).toBe(4);
    expect(sum("DMG%")).toBe(2); // 아델 링크
  });

  test("single-value link edits saved before multi-effect links still apply", () => {
    const got = collectPresets(LINK_SKILLS, { adele: { on: true, value: 6 } }, "link");
    expect(got.filter((x) => x.label.startsWith("아델")).map((x) => `${x.stat}=${x.value}`)).toEqual(["BOSS%=6", "DMG%=2"]);
  });

  test("link can be switched off or given another value", () => {
    const input = { ...defaultPresetInput(LINK_SKILLS), bowman: { on: false }, adele: { on: true, value: 6 } };
    const got = collectPresets(LINK_SKILLS, input, "link");
    expect(got.some((x) => x.label.startsWith("궁수"))).toBe(false);
    expect(got.find((x) => x.label.startsWith("아델"))?.value).toBe(6);
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
