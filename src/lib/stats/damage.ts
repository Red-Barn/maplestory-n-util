import type { FinalStats } from "./compute";
import type { JobView } from "./relevance";

// Damage score: the product of the terms below (formula given by the user).
//
// The full in-game formula has five more factors — final damage, weapon constant, mastery,
// skill damage % and elemental resistance. None of them change with hyper stats (or with anything
// else that only moves the stats below), so they multiply every candidate by the same number and
// are left out: compare scores as ratios, not as absolute damage. Add them here as further terms
// if absolute values are ever needed.

/** Monster DEF the score is measured against (fixed by the user). */
export const MONSTER_DEF = 300;
/** Critical hits deal 35% more on top of critical damage %. */
const BASE_CRIT_BONUS = 0.35;

export type DamageTerms = {
  /** (main stat × 4 + sub stats) × 0.01 */
  stat: number;
  /** total ATT or Magic ATT */
  attack: number;
  /** 1 + damage % + boss damage % */
  damage: number;
  /** 1 − monster DEF × (1 − IED), never below 0 */
  defense: number;
  /** 1 + crit rate × (0.35 + crit damage), crit rate capped at 100% */
  crit: number;
};

export function damageTerms(final: FinalStats, job: JobView): DamageTerms {
  const sub = job.subStats.reduce((sum, s) => sum + final[s], 0);
  return {
    stat: (final[job.mainStat] * 4 + sub) * 0.01,
    attack: final[job.attackType],
    damage: 1 + (final["DMG%"] + final["BOSS%"]) / 100,
    defense: Math.max(0, 1 - (MONSTER_DEF / 100) * (1 - final["IED%"] / 100)),
    crit: 1 + (Math.min(final["CRIT%"], 100) / 100) * (BASE_CRIT_BONUS + final["CDMG%"] / 100),
  };
}

export const damageScore = (terms: DamageTerms): number =>
  terms.stat * terms.attack * terms.damage * terms.defense * terms.crit;
