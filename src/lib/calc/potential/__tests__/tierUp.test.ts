import { describe, expect, it } from "vitest";
import { TIER_UP_CUBES, type TierUpCube } from "@/data/potential";
import { redBarn } from "@/lib/stats/__tests__/fixtures";
import {
  expectedTries,
  maxTargetGrade,
  potentialGrade,
  stepChances,
  successWithin,
  successWithinSteps,
  tierUpPlan,
  triesForConfidence,
  triesForConfidenceSteps,
} from "../tierUp";

const cube = (name: string): TierUpCube => TIER_UP_CUBES.find((c) => c.name === name)!;
const RARE = 1;
const EPIC = 2;
const UNIQUE = 3;
const LEGENDARY = 4;

describe("single step", () => {
  it("expects 1/p cubes", () => {
    expect(expectedTries(0.06)).toBeCloseTo(16.67, 2);
    expect(tierUpPlan(cube("Red Cube"), RARE, EPIC)!.total.expected).toBeCloseTo(16.67, 2);
  });

  it("succeeds within n cubes with 1 − (1 − p)^n", () => {
    expect(successWithin(0.06, 0)).toBe(0);
    expect(successWithin(0.06, 1)).toBeCloseTo(0.06, 12);
    expect(successWithin(0.06, 10)).toBeCloseTo(1 - 0.94 ** 10, 12);
  });

  it("finds the fewest cubes for 90% and 99%", () => {
    for (const p of [0.009901, 0.06, 0.15, 0.003]) {
      for (const q of [0.9, 0.99]) {
        const n = triesForConfidence(p, q);
        expect(successWithin(p, n)).toBeGreaterThanOrEqual(q);
        expect(successWithin(p, n - 1)).toBeLessThan(q);
      }
    }
    expect(triesForConfidence(0.06, 0.9)).toBe(38);
    expect(triesForConfidence(0.06, 0.99)).toBe(75);
    // exactly on the boundary: 1 − 0.5^1 = 0.5
    expect(triesForConfidence(0.5, 0.5)).toBe(1);
  });
});

describe("several steps", () => {
  it("sums the expected cubes of each step", () => {
    const plan = tierUpPlan(cube("Red Cube"), RARE, LEGENDARY)!;
    expect(plan.steps.map((s) => [s.from, s.to])).toEqual([
      [RARE, EPIC],
      [EPIC, UNIQUE],
      [UNIQUE, LEGENDARY],
    ]);
    [0.06, 0.018, 0.003].forEach((p, i) => expect(plan.steps[i].p).toBeCloseTo(p, 12));
    expect(plan.total.expected).toBeCloseTo(1 / 0.06 + 1 / 0.018 + 1 / 0.003, 9);
  });

  it("matches the closed form for one step", () => {
    expect(successWithinSteps([0.06], 25)).toBeCloseTo(successWithin(0.06, 25), 12);
    expect(triesForConfidenceSteps([0.06], 0.9)).toBe(38);
  });

  it("matches the closed form for two steps", () => {
    // P(both within 2) = p1·p2, P(both within 3) = p1·p2·(1 + (1 − p1) + (1 − p2))
    const [p1, p2] = [0.15, 0.035];
    expect(successWithinSteps([p1, p2], 1)).toBe(0);
    expect(successWithinSteps([p1, p2], 2)).toBeCloseTo(p1 * p2, 12);
    expect(successWithinSteps([p1, p2], 3)).toBeCloseTo(p1 * p2 * (3 - p1 - p2), 12);
  });

  it("finds the fewest cubes for 90% and 99% over the whole way", () => {
    const ps = stepChances(cube("Black Cube"), RARE, LEGENDARY)!;
    const plan = tierUpPlan(cube("Black Cube"), RARE, LEGENDARY)!;
    for (const [q, n] of [
      [0.9, plan.total.n90],
      [0.99, plan.total.n99],
    ]) {
      expect(successWithinSteps(ps, n)).toBeGreaterThanOrEqual(q);
      expect(successWithinSteps(ps, n - 1)).toBeLessThan(q);
    }
    // fewer than finishing each step at its own 90% mark one after another
    expect(plan.total.n90).toBeLessThan(plan.steps.reduce((sum, s) => sum + s.n90, 0));
    expect(plan.within(100_000)).toBeCloseTo(1, 9);
    expect(plan.within(plan.total.n90)).toBe(successWithinSteps(ps, plan.total.n90));
  });
});

describe("steps a cube can't do", () => {
  it("stops the Occult Cube at Epic", () => {
    expect(tierUpPlan(cube("Occult Cube"), RARE, EPIC)!.total.expected).toBeCloseTo(1 / 0.009901, 9);
    expect(tierUpPlan(cube("Occult Cube"), EPIC, UNIQUE)).toBeNull();
    expect(tierUpPlan(cube("Occult Cube"), RARE, UNIQUE)).toBeNull();
    expect(maxTargetGrade(cube("Occult Cube"), RARE)).toBe(EPIC);
    expect(maxTargetGrade(cube("Occult Cube"), EPIC)).toBe(EPIC);
  });

  it("lets the other cubes go up to Legendary and no further", () => {
    for (const name of ["Red Cube", "Black Cube", "Bonus Potential Cube", "White Cube"]) {
      expect(maxTargetGrade(cube(name), RARE)).toBe(LEGENDARY);
      expect(tierUpPlan(cube(name), LEGENDARY, LEGENDARY)).toBeNull();
      expect(tierUpPlan(cube(name), UNIQUE, EPIC)).toBeNull();
    }
  });

  it("gives both bonus cubes the same rates", () => {
    expect(cube("White Cube").rates).toEqual([4.7619, 1.9608, 0.4975]);
    expect(cube("Bonus Potential Cube").rates).toEqual(cube("White Cube").rates);
  });
});

describe("potentialGrade", () => {
  it("is the highest grade among the lines", () => {
    expect(potentialGrade(null)).toBe(0);
    expect(
      potentialGrade({
        option1: { code: 1, grade: 3, label: "" },
        option2: { code: 2, grade: 2, label: "" },
        option3: null,
      }),
    ).toBe(3);
  });

  it("reads equipped items", () => {
    const grades = Object.values(redBarn.items)
      .filter((item) => item != null)
      .map((item) => potentialGrade(item.enhance.potential));
    expect(grades.every((g) => g >= 0 && g <= LEGENDARY)).toBe(true);
    expect(Math.max(...grades)).toBe(LEGENDARY);
  });
});
