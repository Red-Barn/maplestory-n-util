import { describe, expect, test } from "vitest";
import { findJob } from "@/data/jobs";
import { collectCharacter, computeStats, damageScore, damageTerms, MONSTER_DEF, type FinalStats } from "..";
import { redBarn } from "./fixtures";

const job = findJob(313)!; // Bowmaster: DEX / STR / ATT

const stats = (over: Partial<FinalStats>): FinalStats => ({
  STR: 0,
  DEX: 0,
  INT: 0,
  LUK: 0,
  ATT: 0,
  MATT: 0,
  "DMG%": 0,
  "BOSS%": 0,
  "NORMAL%": 0,
  "CRIT%": 0,
  "CDMG%": 0,
  "IED%": 0,
  "FD%": 0,
  ...over,
});

describe("damage terms", () => {
  test("each term by hand", () => {
    const t = damageTerms(
      stats({ DEX: 30000, STR: 4000, INT: 9999, ATT: 2500, MATT: 9999, "DMG%": 50, "BOSS%": 250, "IED%": 90, "CRIT%": 80, "CDMG%": 60 }),
      job,
    );
    expect(t.stat).toBeCloseTo((30000 * 4 + 4000) * 0.01); // 1240, INT ignored
    expect(t.attack).toBe(2500); // the job's attack type only
    expect(t.damage).toBeCloseTo(1 + 0.5 + 2.5);
    expect(t.defense).toBeCloseTo(1 - 3 * 0.1); // 0.7 against 300% DEF
    expect(t.crit).toBeCloseTo(1 + 0.8 * (0.35 + 0.6));
    expect(damageScore(t)).toBeCloseTo(1240 * 2500 * 4 * 0.7 * 1.76);
  });

  test("monster DEF is 300%: below 66.7% IED nothing gets through", () => {
    expect(MONSTER_DEF).toBe(300);
    expect(damageTerms(stats({ "IED%": 50 }), job).defense).toBe(0);
    expect(damageTerms(stats({ "IED%": 100 }), job).defense).toBe(1);
  });

  test("crit rate is capped at 100%", () => {
    const at = (crit: number) => damageTerms(stats({ "CRIT%": crit, "CDMG%": 50 }), job).crit;
    expect(at(130)).toBe(at(100));
    expect(at(100)).toBeCloseTo(1.85);
  });

  test("a magic job uses Magic ATT and its own stats", () => {
    const mage = { mainStat: "INT", subStats: ["LUK"], attackType: "MATT" } as const;
    const t = damageTerms(stats({ INT: 1000, LUK: 200, DEX: 9999, ATT: 9999, MATT: 300 }), { ...mage, subStats: [...mage.subStats] });
    expect([t.stat, t.attack]).toEqual([42, 300]);
  });

  test("RedBarn: more of any stat the formula uses raises the score", () => {
    const c = collectCharacter(redBarn);
    const score = (extra: Parameters<typeof computeStats>[0]) =>
      damageScore(damageTerms(computeStats([...c.permanent, ...extra], c.ap).final, c.job!));
    const base = score([]);
    expect(base).toBeGreaterThan(0);
    for (const stat of ["DEX_FIXED", "STR_FIXED", "ATT", "DMG%", "BOSS%", "IED%", "CDMG%"] as const) {
      expect(score([{ stat, value: 10, source: "hyper", label: "x" }])).toBeGreaterThan(base);
    }
    // stats the Bowmaster doesn't use change nothing
    expect(score([{ stat: "INT_FIXED", value: 500, source: "hyper", label: "x" }])).toBe(base);
    expect(score([{ stat: "MATT", value: 500, source: "hyper", label: "x" }])).toBe(base);
  });
});
