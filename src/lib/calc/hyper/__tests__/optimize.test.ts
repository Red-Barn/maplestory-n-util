import { describe, expect, test } from "vitest";
import { HYPER_STATS } from "@/data/hyperStats";
import { apiHyperInput, choicesForJob, collectCharacter, type StatContribution } from "@/lib/stats";
import { brownBarn, orangeBarn, redBarn, unjna } from "@/lib/stats/__tests__/fixtures";
import type { CharacterBundle } from "@/types/msu";
import { apiSpentPoints, cumulativeCost, levelsFromInput, spentPoints, type HyperLevels } from "../cost";
import { hyperScore, optimizeHyper, type HyperContext } from "../optimize";

/** The character without its hyper stats, as the calculator page sees it (API ability, buffs off). */
function context(bundle: CharacterBundle): HyperContext {
  const c = collectCharacter(bundle);
  const hyper = new Set(c.hyper);
  return { base: c.permanent.filter((x) => !hyper.has(x)), ap: c.ap, job: c.job! };
}

const bowmaster = { mainStat: "DEX", subStats: ["STR"], attackType: "ATT" } as const;
const stat = (s: StatContribution["stat"], value: number): StatContribution => ({ stat: s, value, source: "custom", label: "test" });

/** A small character: ATT % makes the flooring matter, crit rate sits just under the cap. */
const small: HyperContext = {
  base: [stat("DEX", 900), stat("STR", 300), stat("ATT", 101), stat("ATT%", 7), stat("DMG%", 40), stat("IED%", 80), stat("CRIT%", 97), stat("CDMG%", 20)],
  ap: { STR: 4, DEX: 500, INT: 4, LUK: 4 },
  job: { ...bowmaster, subStats: [...bowmaster.subStats] },
};

/** Best score per budget by trying every level combination of every stat the job uses. */
function bruteForce(ctx: HyperContext, budgets: number[], maxLevel: number): number[] {
  const ids = choicesForJob(HYPER_STATS, ctx.job).map((d) => d.id);
  const best = budgets.map(() => 0);
  const levels: HyperLevels = {};
  const visit = (i: number, cost: number) => {
    if (i === ids.length) {
      const score = hyperScore(ctx, levels);
      budgets.forEach((b, n) => {
        if (cost <= b && score > best[n]) best[n] = score;
      });
      return;
    }
    for (let level = 0; level <= maxLevel; level++) {
      levels[ids[i]] = level;
      visit(i + 1, cost + cumulativeCost(level));
    }
    levels[ids[i]] = 0;
  };
  visit(0, 0);
  return best;
}

describe("optimizeHyper", () => {
  test("matches brute force on small budgets", () => {
    const budgets = [0, 1, 2, 3, 5, 8, 13, 20, 30, 45, 70];
    const expected = bruteForce(small, budgets, 4);
    budgets.forEach((budget, n) => {
      const plan = optimizeHyper(small, budget, 4);
      expect(plan.score).toBeCloseTo(expected[n], 6);
      expect(plan.used).toBeLessThanOrEqual(budget);
      expect(spentPoints(plan.levels)).toBe(plan.used);
    });
  });

  test("matches brute force on RedBarn", () => {
    const ctx = context(redBarn);
    const budgets = [0, 4, 9, 15, 24];
    const expected = bruteForce(ctx, budgets, 2);
    budgets.forEach((budget, n) => {
      const plan = optimizeHyper(ctx, budget, 2);
      expect(plan.score / expected[n]).toBeCloseTo(1, 10);
    });
  });

  test("no budget, no levels", () => {
    const plan = optimizeHyper(small, 0);
    expect(plan.used).toBe(0);
    expect(Object.values(plan.levels).every((l) => l === 0)).toBe(true);
    expect(plan.score).toBe(hyperScore(small, {}));
  });

  test.each([
    ["RedBarn", redBarn],
    ["BrownBarn", brownBarn],
    ["OrangeBarn", orangeBarn],
    ["unjna", unjna],
  ])("%s: never worse than the API preset with the same points", (_name, bundle) => {
    const ctx = context(bundle);
    const current = levelsFromInput(apiHyperInput(bundle.character));
    const plan = optimizeHyper(ctx, spentPoints(current));
    expect(plan.score).toBeGreaterThanOrEqual(hyperScore(ctx, current));
    expect(plan.used).toBeLessThanOrEqual(spentPoints(current));
    // more points never hurt
    expect(optimizeHyper(ctx, apiSpentPoints(bundle.character)).score).toBeGreaterThanOrEqual(plan.score);
  });

  test("a Bowmaster gets nothing on INT, LUK", () => {
    const plan = optimizeHyper(context(redBarn), 810);
    expect(plan.levels.int ?? 0).toBe(0);
    expect(plan.levels.luk ?? 0).toBe(0);
    expect(plan.levels.dex).toBeGreaterThan(0);
  });

  test("crit rate stops at the 100% cap", () => {
    // 97% base: Lv.3 (+3%) reaches the cap, anything above is wasted
    expect(optimizeHyper(small, 5000).levels.criticalRate).toBe(3);
    const capped = { ...small, base: [...small.base, stat("CRIT%", 3)] };
    expect(optimizeHyper(capped, 5000).levels.criticalRate).toBe(0);
  });

  test("with Critical Reinforce, crit rate is worth points above the cap", () => {
    const capped = { ...small, base: [...small.base, stat("CRIT%", 3)] };
    const plan = optimizeHyper({ ...capped, cdmgPerCrit: 0.25 }, 5000);
    expect(plan.levels.criticalRate).toBe(15);
  });

  test("matches brute force with Critical Reinforce", () => {
    const ctx = { ...small, cdmgPerCrit: 0.2322 };
    const budgets = [0, 3, 8, 20, 45, 70];
    const expected = bruteForce(ctx, budgets, 4);
    budgets.forEach((budget, n) => {
      expect(optimizeHyper(ctx, budget, 4).score).toBeCloseTo(expected[n], 6);
    });
  });

  test("with points to spare every useful stat is maxed and the rest is left over", () => {
    const plan = optimizeHyper(small, 5000);
    // DEX, STR, ATT, damage, boss, IED, crit damage at Lv.15 + crit rate Lv.3
    expect(plan.used).toBe(7 * 550 + 7);
  });
});
