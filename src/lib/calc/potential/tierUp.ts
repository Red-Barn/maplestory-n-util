import { MAX_GRADE, MIN_GRADE, type TierUpCube } from "@/data/potential";
import type { PotentialLines } from "@/types/msu";

// Potential tier-up: every cube used has a fixed chance p of raising the grade by one step.
// Probabilities here are fractions (0.06), the data table holds percents (6).

/** Upper bound for the "how many cubes for q%" search, so a bad input can't loop forever. */
const MAX_TRIES = 10_000_000;

/** Expected cubes until one success. */
export const expectedTries = (p: number): number => 1 / p;

/** Chance of at least one success within n cubes. */
export const successWithin = (p: number, n: number): number => 1 - (1 - p) ** Math.max(0, Math.floor(n));

/** Fewest cubes that succeed with probability ≥ q: ⌈ln(1 − q) / ln(1 − p)⌉. */
export function triesForConfidence(p: number, q: number): number {
  if (p >= 1) return 1;
  const n = Math.max(1, Math.ceil(Math.log(1 - q) / Math.log(1 - p)));
  // the logs can land a hair above an exact integer
  return n > 1 && successWithin(p, n - 1) >= q ? n - 1 : n;
}

/** Grade of an item's potential: the highest grade among its lines, 0 when it has none. */
export function potentialGrade(lines: PotentialLines): number {
  if (!lines) return 0;
  return Math.max(0, ...[lines.option1, lines.option2, lines.option3].map((o) => o?.grade ?? 0));
}

/** Chance of one cube raising `from` by one grade, or null when the cube can't do that step. */
export function stepChance(cube: TierUpCube, from: number): number | null {
  const rate = cube.rates[from - MIN_GRADE];
  return rate == null ? null : rate / 100;
}

/** Highest grade the cube can take an item to from `from` (= `from` when it can't raise it at all). */
export function maxTargetGrade(cube: TierUpCube, from: number): number {
  let grade = from;
  while (grade < MAX_GRADE && stepChance(cube, grade) != null) grade++;
  return grade;
}

/** Chances of each step from `from` up to `to`, or null when the cube can't do one of them. */
export function stepChances(cube: TierUpCube, from: number, to: number): number[] | null {
  if (from < MIN_GRADE || to > MAX_GRADE || to <= from) return null;
  const out: number[] = [];
  for (let grade = from; grade < to; grade++) {
    const p = stepChance(cube, grade);
    if (p == null) return null;
    out.push(p);
  }
  return out;
}

/** One more cube: whatever step the item is on, it moves up with that step's chance. */
function applyCube(state: number[], ps: number[]) {
  for (let i = ps.length - 1; i >= 0; i--) {
    const moved = state[i] * ps[i];
    state[i] -= moved;
    state[i + 1] += moved;
  }
}

/**
 * Chance of clearing every step in `ps` (in order) within n cubes. For a single step this is
 * successWithin; for several, the cubes left over from one step carry on to the next.
 */
export function successWithinSteps(ps: number[], n: number): number {
  const state = [1, ...ps.map(() => 0)];
  for (let used = Math.floor(n); used > 0; used--) applyCube(state, ps);
  return state[ps.length];
}

/** Fewest cubes that clear every step in `ps` with probability ≥ q. */
export function triesForConfidenceSteps(ps: number[], q: number): number {
  if (ps.length === 1) return triesForConfidence(ps[0], q);
  const state = [1, ...ps.map(() => 0)];
  let n = 0;
  while (state[ps.length] < q && n < MAX_TRIES) {
    applyCube(state, ps);
    n++;
  }
  return n;
}

export type TierUpCounts = {
  /** expected number of cubes */
  expected: number;
  /** cubes that are enough 90% / 99% of the time */
  n90: number;
  n99: number;
};

export type TierUpStep = TierUpCounts & { from: number; to: number; p: number };

export type TierUpPlan = {
  steps: TierUpStep[];
  /** The whole way. n90 / n99 come from the combined distribution, so they aren't the steps' sum. */
  total: TierUpCounts;
  /** chance of reaching the target within n cubes */
  within: (n: number) => number;
};

/** Cubes needed to take an item from `from` to `to`, or null when the cube can't do it. */
export function tierUpPlan(cube: TierUpCube, from: number, to: number): TierUpPlan | null {
  const ps = stepChances(cube, from, to);
  if (!ps) return null;
  const steps = ps.map((p, i) => ({
    from: from + i,
    to: from + i + 1,
    p,
    expected: expectedTries(p),
    n90: triesForConfidence(p, 0.9),
    n99: triesForConfidence(p, 0.99),
  }));
  return {
    steps,
    total: {
      expected: steps.reduce((sum, s) => sum + s.expected, 0),
      n90: triesForConfidenceSteps(ps, 0.9),
      n99: triesForConfidenceSteps(ps, 0.99),
    },
    within: (n) => successWithinSteps(ps, n),
  };
}
