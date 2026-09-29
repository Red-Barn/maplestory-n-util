import { describe, expect, test } from "vitest";
import { apStatToFinal, collectCharacter, collectCollection, collectUnion, computeStats } from "..";
import { collectSets } from "../collectors/sets";
import { redBarn } from "./fixtures";

const c = collectCharacter(redBarn);
const defaultBuffs = c.buffs.filter((b) => b.defaultOn).flatMap((b) => b.contributions);
const base = [...c.permanent, ...defaultBuffs];
const api = apStatToFinal(redBarn.character.apStat);
const buff = (id: string) => c.buffs.find((b) => b.id === id)!;

describe("RedBarn (Bowmaster Lv.244)", () => {
  test("detects job and learned buffs", () => {
    expect(c.job?.name).toBe("Bowmaster");
    expect(c.buffs.map((b) => b.id)).toEqual([
      "season-tonic",
      "echo-of-hero",
      "maple-warrior",
      "sharp-eyes",
      "quiver-barrage",
      "storm-of-arrows",
    ]);
  });

  test("only the season buff is on by default (the API snapshot includes it, not skill buffs)", () => {
    expect(c.buffs.filter((b) => b.defaultOn).map((b) => b.id)).toEqual(["season-tonic"]);
  });

  test("final damage matches in-game exactly (multiplicative)", () => {
    expect(computeStats(base, c.ap).final["FD%"]).toBe(api["FD%"]);
  });

  test("set effects apply by equipped piece count", () => {
    const labels = new Set(collectSets(redBarn.items, redBarn.sets).map((x) => x.label.match(/^.*?\d+세트/)![0]));
    expect(labels).toEqual(
      new Set([
        "Root Abyss Set (Bowman) 2세트",
        "Root Abyss Set (Bowman) 3세트",
        "Boss Accessory Set 3세트",
        "Boss Accessory Set 5세트",
        "Boss Accessory Set 7세트",
        "Boss Accessory Set 9세트",
        "AbsoLab Set (Bowman) 2세트",
        "AbsoLab Set (Bowman) 3세트",
        "AbsoLab Set (Bowman) 4세트",
      ]),
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

test("stat % totals used by the stat panel", () => {
  const t = computeStats(c.permanent, c.ap).totals;
  expect(t["DEX%"]).toBeGreaterThan(0);
  expect(t["ALL%"]).toBeGreaterThan(0);
  expect(t["ATT%"]).toBeGreaterThan(0);
});
