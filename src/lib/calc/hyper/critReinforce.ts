import type { DamageTerms, FinalStats } from "@/lib/stats";

// Critical Reinforce (Bowman 5th job skill, not in the API skill list): for 30 seconds, adds a
// share of the crit rate to critical damage — (20 + skill level)% of it, Lv.1 = 21% to Lv.30 = 50%,
// counting crit rate above 100% too (180% → +90% at Lv.30). Formula given by the user.
//
// Over a burst cycle it is averaged into critical damage, weighted by how much of the damage is
// dealt while it is on:
//   extra crit damage % = crit rate % × conversion × (30 s / cycle) × (DPS while on ÷ total DPS)
// e.g. 20% crit, Lv.30, 2 min, 1.8579 efficiency → 20 × 0.5 × 0.25 × 1.8579 = 4.64%.
// The crit term is linear in crit damage, so this average is exact, not an approximation.

export const CRIT_REINFORCE_DURATION = 30;
export const CRIT_REINFORCE_MAX_LEVEL = 30;
/** Burst cycles in seconds (2 min, 3 min). */
export const CRIT_REINFORCE_CYCLES = [120, 180];

export type CritReinforceInput = {
  level: number;
  /** burst cycle in seconds */
  cycle: number;
  /** DPS over the whole cycle */
  totalDps?: number;
  /** DPS while Critical Reinforce is on */
  activeDps?: number;
};

/** Every Bowman job can use it (API className, since the skill isn't in the skill list). */
export const hasCritReinforce = (className: string): boolean => className === "Bowman";

/** Share of crit rate added to crit damage: 0.21 at Lv.1 … 0.5 at Lv.30. */
export const conversionRate = (level: number): number =>
  (20 + Math.max(1, Math.min(Math.floor(level), CRIT_REINFORCE_MAX_LEVEL))) / 100;

/** Share of the cycle the skill is on. */
export const uptime = (cycle: number): number => Math.min(1, CRIT_REINFORCE_DURATION / cycle);

/** DPS while it is on ÷ DPS over the whole cycle; undefined until both are entered. */
export function attackEfficiency(totalDps?: number, activeDps?: number): number | undefined {
  if (!totalDps || !activeDps || totalDps <= 0 || activeDps <= 0) return undefined;
  return activeDps / totalDps;
}

/** Average extra crit damage % per 1% crit rate; undefined until both DPS values are entered. */
export function cdmgPerCrit({ level, cycle, totalDps, activeDps }: CritReinforceInput): number | undefined {
  const efficiency = attackEfficiency(totalDps, activeDps);
  return efficiency === undefined ? undefined : conversionRate(level) * uptime(cycle) * efficiency;
}

/** Average extra crit damage % at `critRate` (not capped at 100%). */
export const reinforceCdmg = (critRate: number, perCrit: number): number => Math.max(0, critRate) * perCrit;

/** The damage terms with the averaged crit damage added to the crit term. */
export function applyCritReinforce(terms: DamageTerms, final: FinalStats, perCrit: number | undefined): DamageTerms {
  if (!perCrit) return terms;
  const rate = Math.min(Math.max(final["CRIT%"], 0), 100) / 100;
  return { ...terms, crit: terms.crit + (rate * reinforceCdmg(final["CRIT%"], perCrit)) / 100 };
}
