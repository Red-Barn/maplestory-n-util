import { describe, expect, test } from "vitest";
import { findJob } from "@/data/jobs";
import { damageTerms, type FinalStats } from "@/lib/stats";
import {
  applyCritReinforce,
  attackEfficiency,
  cdmgPerCrit,
  conversionRate,
  hasCritReinforce,
  reinforceCdmg,
  uptime,
} from "../critReinforce";

const job = findJob(313)!; // Bowmaster

const final = (crit: number, cdmg: number): FinalStats => ({
  STR: 0, DEX: 0, INT: 0, LUK: 0, ATT: 0, MATT: 0,
  "DMG%": 0, "BOSS%": 0, "NORMAL%": 0, "CRIT%": crit, "CDMG%": cdmg, "IED%": 0, "FD%": 0,
});

describe("Critical Reinforce", () => {
  test("the user's example: 2 min burst, Lv.30", () => {
    const efficiency = attackEfficiency(40_339_381_998, 74_946_229_978)!;
    expect(efficiency).toBeCloseTo(1.8579, 4);
    const perCrit = cdmgPerCrit({ level: 30, cycle: 120, totalDps: 40_339_381_998, activeDps: 74_946_229_978 })!;
    // 20% crit → +10% crit damage for 30 s → 2.5% averaged → × 1.8579
    expect(reinforceCdmg(20, perCrit)).toBeCloseTo(4.64, 2);
  });

  test("conversion by skill level and uptime by cycle", () => {
    expect(conversionRate(1)).toBeCloseTo(0.21);
    expect(conversionRate(30)).toBeCloseTo(0.5);
    expect(conversionRate(99)).toBeCloseTo(0.5);
    expect(uptime(120)).toBe(0.25);
    expect(uptime(180)).toBeCloseTo(1 / 6);
  });

  test("not used until both DPS values are entered", () => {
    expect(cdmgPerCrit({ level: 30, cycle: 120 })).toBeUndefined();
    expect(cdmgPerCrit({ level: 30, cycle: 120, totalDps: 100 })).toBeUndefined();
    expect(cdmgPerCrit({ level: 30, cycle: 120, totalDps: 0, activeDps: 100 })).toBeUndefined();
  });

  test("crit rate above 100% converts too", () => {
    expect(reinforceCdmg(180, 0.5)).toBe(90);
    // the crit term still caps the crit chance itself at 100%
    const f = final(180, 50);
    const terms = applyCritReinforce(damageTerms(f, job), f, 0.5);
    expect(terms.crit).toBeCloseTo(1 + 1 * (0.35 + 0.5 + 0.9));
  });

  test("only Bowman jobs", () => {
    expect(hasCritReinforce("Bowman")).toBe(true);
    expect(hasCritReinforce("Warrior")).toBe(false);
  });
});
