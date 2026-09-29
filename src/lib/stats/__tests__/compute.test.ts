import { describe, expect, test } from "vitest";
import { apStatToFinal, calibrate, collectCharacter, collectUnion, computeStats } from "..";
import { collectSets } from "../collectors/sets";
import { redBarn } from "./fixtures";

const c = collectCharacter(redBarn);
const defaultBuffs = c.buffs.filter((b) => b.defaultOn).flatMap((b) => b.contributions);
const api = apStatToFinal(redBarn.character.apStat);

describe("RedBarn (Bowmaster Lv.244)", () => {
  test("detects job and learned buffs", () => {
    expect(c.job?.name).toBe("Bowmaster");
    expect(c.buffs.map((b) => b.id)).toEqual(["echo-of-hero", "maple-warrior", "sharp-eyes", "quiver-barrage", "storm-of-arrows"]);
  });

  test("final damage matches in-game exactly (multiplicative)", () => {
    expect(computeStats(c.permanent, c.ap).final["FD%"]).toBe(api["FD%"]);
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

  test("calibration reproduces the in-game stat window", () => {
    const base = [...c.permanent, ...defaultBuffs];
    const fix = calibrate(base, c.ap, api);
    const r = computeStats([...base, ...fix], c.ap).final;
    for (const k of Object.keys(api) as (keyof typeof api)[]) expect(r[k], k).toBeCloseTo(api[k], 1);
  });

  test("toggling a buff changes stats by its effect", () => {
    const base = [...c.permanent, ...defaultBuffs];
    const qb = c.buffs.find((b) => b.id === "quiver-barrage")!;
    const off = computeStats(base, c.ap).final.ATT;
    const on = computeStats([...base, ...qb.contributions], c.ap).final.ATT;
    const t = computeStats(base, c.ap).totals;
    expect(on).toBe(Math.floor(t.ATT! * (1 + (t["ATT%"]! + 17) / 100)));
    expect(on).toBeGreaterThan(off);
  });
});

describe("union raider input", () => {
  const base = [...c.permanent, ...defaultBuffs];
  const union = collectUnion({ DEX: 500, STR: 200 });

  test("adds %-unaffected stat one-for-one", () => {
    const before = computeStats(base, c.ap).final;
    const after = computeStats([...base, ...union], c.ap).final;
    expect(after.DEX - before.DEX).toBe(500);
    expect(after.STR - before.STR).toBe(200);
  });

  test("shrinks the calibration gap by the same amount", () => {
    const gap = (list: typeof base) => calibrate(list, c.ap, api).find((x) => x.stat === "DEX_FIXED")?.value ?? 0;
    expect(gap(base) - gap([...base, ...union])).toBe(500);
  });
});

test("stat % totals used by the stat panel", () => {
  const t = computeStats(c.permanent, c.ap).totals;
  expect(t["DEX%"]).toBeGreaterThan(0);
  expect(t["ALL%"]).toBeGreaterThan(0);
  expect(t["ATT%"]).toBeGreaterThan(0);
});
