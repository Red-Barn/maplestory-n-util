import { describe, expect, it } from "vitest";
import { SUCCESS_RATE } from "@/data/starforce";
import {
  attemptCost,
  expectedToTarget,
  outcomes,
  pricedUpTo,
  PROTECTABLE_STARS,
  seededRng,
  simulateRuns,
  starOdds,
  summarize,
  type StarPrices,
} from "..";

const OFF = { starCatch: false, protect: [] };
const CATCH = { starCatch: true, protect: [] };
const PROTECT = { starCatch: false, protect: PROTECTABLE_STARS };

// The table from issue #33: [success, keep, drop, major failure] in % for n ★ → n+1 ★.
const TABLE: [number, number, number, number][] = [
  [95, 5, 0, 0],
  [90, 10, 0, 0],
  [85, 15, 0, 0],
  [85, 15, 0, 0],
  [80, 20, 0, 0],
  [75, 25, 0, 0],
  [70, 30, 0, 0],
  [65, 35, 0, 0],
  [60, 40, 0, 0],
  [55, 45, 0, 0],
  [50, 50, 0, 0],
  [45, 0, 55, 0],
  [40, 0, 59.4, 0.6],
  [35, 0, 63.7, 1.3],
  [30, 0, 68.6, 1.4],
  [30, 67.9, 0, 2.1],
  [30, 0, 67.9, 2.1],
  [30, 0, 67.9, 2.1],
  [30, 0, 67.2, 2.8],
  [30, 0, 67.2, 2.8],
  [30, 63, 0, 7],
  [30, 0, 63, 7],
  [3, 0, 77.6, 19.4],
  [2, 0, 68.6, 29.4],
  [1, 0, 59.4, 39.6],
];

const prices: StarPrices = Object.fromEntries(Array.from({ length: 25 }, (_, star) => [star, (star + 1) * 100]));

describe("starOdds", () => {
  it("reproduces all 25 rows of the table from the success rate and n", () => {
    expect(TABLE).toHaveLength(25);
    TABLE.forEach(([success, keep, drop, major], star) => {
      const o = starOdds(star, OFF);
      expect(o.success * 100).toBeCloseTo(success, 9);
      expect(o.keep * 100).toBeCloseTo(keep, 9);
      expect(o.drop * 100).toBeCloseTo(drop, 9);
      expect(o.major * 100).toBeCloseTo(major, 9);
      expect(o.keep === 0 || o.drop === 0).toBe(true);
      expect(o.success + o.keep + o.drop + o.major).toBeCloseTo(1, 12);
    });
  });

  it("Star Catch multiplies success by 1.05 and shrinks Major Failure with it", () => {
    expect(starOdds(0, CATCH).success).toBeCloseTo(0.9975, 12);
    expect(starOdds(0, CATCH).keep).toBeCloseTo(0.0025, 12);
    // 22 ★: success 3% → 3.15%, Major Failure (1 − 0.0315) × 20%
    const o = starOdds(22, CATCH);
    expect(o.success).toBeCloseTo(0.0315, 12);
    expect(o.major).toBeCloseTo((1 - 0.0315) * 0.2, 12);
    expect(o.major).toBeLessThan(starOdds(22, OFF).major);
    expect(o.drop).toBeCloseTo(1 - o.success - o.major, 12);
  });

  it("Protect removes Major Failure at 12–16 ★ only, moving it to Keep/Drop", () => {
    for (let star = 12; star <= 16; star++) {
      const plain = starOdds(star, OFF);
      const safe = starOdds(star, PROTECT);
      expect(safe.major).toBe(0);
      expect(safe.success).toBe(plain.success);
      expect(safe.keep + safe.drop).toBeCloseTo(plain.keep + plain.drop + plain.major, 12);
    }
    expect(starOdds(15, PROTECT).drop).toBe(0);
    expect(starOdds(17, PROTECT)).toEqual(starOdds(17, OFF));
    expect(starOdds(11, PROTECT)).toEqual(starOdds(11, OFF));
  });
});

describe("Protect per star", () => {
  it("is 12–16 ★, each chosen separately", () => {
    expect(PROTECTABLE_STARS).toEqual([12, 13, 14, 15, 16]);
  });

  it("only applies at the chosen stars", () => {
    const some = { starCatch: false, protect: [15, 16] };
    expect(starOdds(15, some).major).toBe(0);
    expect(starOdds(16, some).major).toBe(0);
    expect(starOdds(12, some)).toEqual(starOdds(12, OFF));
    expect(starOdds(14, some)).toEqual(starOdds(14, OFF));
    expect(attemptCost(16, prices, some)).toBe(3400);
    expect(attemptCost(13, prices, some)).toBe(1400);
  });

  it("ignores stars outside 12–16", () => {
    const outside = { starCatch: false, protect: [11, 17] };
    expect(starOdds(17, outside)).toEqual(starOdds(17, OFF));
    expect(attemptCost(17, prices, outside)).toBe(1800);
  });

  it("lands between no Protect and full Protect in expectation", () => {
    const none = expectedToTarget(12, 17, prices, OFF);
    const some = expectedToTarget(12, 17, prices, { starCatch: false, protect: [15, 16] });
    const all = expectedToTarget(12, 17, prices, PROTECT);
    expect(some.majorFailures).toBeLessThan(none.majorFailures);
    expect(some.majorFailures).toBeGreaterThan(all.majorFailures);
  });
});

describe("attemptCost", () => {
  it("doubles at protected stars, except on the guaranteed attempt", () => {
    expect(attemptCost(12, prices, OFF)).toBe(1300);
    expect(attemptCost(12, prices, PROTECT)).toBe(2600);
    expect(attemptCost(16, prices, PROTECT)).toBe(3400);
    expect(attemptCost(17, prices, PROTECT)).toBe(1800);
    expect(attemptCost(12, prices, PROTECT, true)).toBe(1300);
  });
});

describe("outcomes", () => {
  it("counts Drops in a row, 11 ★ included, and guarantees success after two", () => {
    expect(outcomes(12, 0, OFF).find((t) => t.star === 11)).toMatchObject({ drops: 1, major: false });
    expect(outcomes(11, 1, OFF).find((t) => t.star === 10)).toMatchObject({ drops: 2 });
    expect(outcomes(10, 2, OFF)).toEqual([{ p: 1, star: 11, drops: 0, major: false }]);
    expect(outcomes(22, 2, OFF)).toEqual([{ p: 1, star: 23, drops: 0, major: false }]);
  });

  it("resets the count on success, Keep and Major Failure", () => {
    // 16 ★ drops to 15 ★ (count 1); every outcome at 15 ★ (success, Keep, Major Failure) resets it
    expect(outcomes(16, 0, OFF).find((t) => t.star === 15)?.drops).toBe(1);
    const at15 = outcomes(15, 1, OFF);
    expect(at15.map((t) => t.star).sort()).toEqual([10, 15, 16]);
    expect(at15.every((t) => t.drops === 0)).toBe(true);
    expect(at15.find((t) => t.major)?.star).toBe(10);
  });
});

describe("expectedToTarget", () => {
  it("0 → 10 ★ takes Σ 1/success attempts", () => {
    const sum = SUCCESS_RATE.slice(0, 10).reduce((s, rate) => s + 100 / rate, 0);
    const e = expectedToTarget(0, 10, prices, OFF);
    expect(e.attempts).toBeCloseTo(sum, 9);
    expect(e.majorFailures).toBe(0);
    expect(e.cost).toBeCloseTo(SUCCESS_RATE.slice(0, 10).reduce((s, rate, star) => s + (prices[star] * 100) / rate, 0), 6);
    expect(e.attemptsAt[3]).toBeCloseTo(100 / 85, 9);
  });

  it("is zero when the target is already reached", () => {
    expect(expectedToTarget(12, 12, prices, OFF)).toEqual({ cost: 0, attempts: 0, majorFailures: 0, attemptsAt: {} });
  });

  it("matches a hand-solved chain for 10 → 12 ★", () => {
    // States 10, 11 and 10 after one Drop (10'). From 11 ★: 45% success, 55% Drop to 10'.
    // 10' behaves like 10 (a Keep resets, success resets), so E10' = E10.
    // E10 = 1 + 0.5 E10 + 0.5 E11, E11 = 1 + 0.55 E10  →  E10 = 1.5 / 0.225
    const e = expectedToTarget(10, 12, prices, OFF);
    expect(e.attempts).toBeCloseTo(1.5 / 0.225, 9);
    const at = Object.values(e.attemptsAt).reduce((s, v) => s + v, 0);
    expect(at).toBeCloseTo(e.attempts, 9);
  });

  it("Protect costs more per attempt but avoids Major Failures at 12–16 ★", () => {
    const plain = expectedToTarget(12, 17, prices, OFF);
    const safe = expectedToTarget(12, 17, prices, PROTECT);
    expect(plain.majorFailures).toBeGreaterThan(0);
    expect(safe.majorFailures).toBeCloseTo(0, 12);
    expect(safe.attempts).toBeLessThan(plain.attempts);
  });
});

describe("simulation", () => {
  it("is reproducible for a seed", () => {
    const a = simulateRuns(10, 15, prices, OFF, 50, seededRng(7));
    const b = simulateRuns(10, 15, prices, OFF, 50, seededRng(7));
    expect(a).toEqual(b);
  });

  it.each([
    ["0 → 12", 0, 12, OFF],
    ["10 → 17", 10, 17, OFF],
    ["12 → 17 with Protect and Star Catch", 12, 17, { starCatch: true, protect: PROTECTABLE_STARS }],
    ["15 → 20", 15, 20, CATCH],
  ] as const)("mean converges to the exact expectation (%s)", (_name, from, to, opts) => {
    const exact = expectedToTarget(from, to, prices, opts);
    const sim = summarize(simulateRuns(from, to, prices, opts, 20000, seededRng(33)));
    expect(sim.cost.mean / exact.cost).toBeCloseTo(1, 1);
    expect(sim.attempts.mean / exact.attempts).toBeCloseTo(1, 1);
    if (exact.majorFailures > 0) expect(sim.majorFailures.mean / exact.majorFailures).toBeCloseTo(1, 1);
    expect(sim.cost.p10).toBeLessThanOrEqual(sim.cost.median);
    expect(sim.cost.median).toBeLessThanOrEqual(sim.cost.p90);
  });
});

describe("pricedUpTo", () => {
  // like Fafnir Wind Chaser (1452205): metadata says 25 ★, the price API gives 0 from 22 ★
  const partial: StarPrices = Object.fromEntries(Array.from({ length: 25 }, (_, star) => [star, star < 22 ? 100 : 0]));

  it("stops at the first star without a price", () => {
    expect(pricedUpTo(partial, 0, 25)).toBe(22);
    expect(pricedUpTo(partial, 17, 25)).toBe(22);
  });

  it("is capped by the item's max star", () => {
    expect(pricedUpTo(partial, 0, 15)).toBe(15);
    expect(pricedUpTo(prices, 0, 25)).toBe(25);
  });

  it("returns the start when the first attempt has no price", () => {
    expect(pricedUpTo(partial, 22, 25)).toBe(22);
    expect(pricedUpTo({}, 5, 25)).toBe(5);
  });
});
