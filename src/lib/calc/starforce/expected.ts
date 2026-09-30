import { GUARANTEE_AFTER_DROPS, MAJOR_FAILURE_STAR } from "@/data/starforce";
import { attemptCost, isGuaranteed, outcomes, type StarforceOptions, type StarPrices } from "./odds";

// Exact expectations from the Markov chain over (star, Drops in a row). With P the transition
// matrix between the states below the target, (I − P)x = r gives the expected total of a
// per-attempt reward r (price, 1 attempt, Major Failure chance) from every state, and the
// transposed system gives how often each state is visited from the start.

export type Expected = {
  /** expected total price in NESO */
  cost: number;
  attempts: number;
  majorFailures: number;
  /** expected number of attempts made at each star */
  attemptsAt: Record<number, number>;
};

const DROP_STATES = GUARANTEE_AFTER_DROPS + 1;

/** Solves Ax = b for each b (Gaussian elimination with partial pivoting). */
function solve(a: number[][], bs: number[][]): number[][] {
  const n = a.length;
  const m = a.map((row, i) => [...row, ...bs.map((b) => b[i])]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < n; r++) {
      if (r === col || m[r][col] === 0) continue;
      const f = m[r][col] / m[col][col];
      for (let c = col; c < m[r].length; c++) m[r][c] -= f * m[col][c];
    }
  }
  return bs.map((_, k) => m.map((row, i) => row[n + k] / row[i]));
}

export function expectedToTarget(from: number, to: number, prices: StarPrices, opts: StarforceOptions): Expected {
  if (to <= from) return { cost: 0, attempts: 0, majorFailures: 0, attemptsAt: {} };

  // A Drop or a Major Failure can take the item below where it started, but never below 10 ★.
  const low = Math.min(from, MAJOR_FAILURE_STAR);
  const size = (to - low) * DROP_STATES;
  const index = (star: number, drops: number) => (star - low) * DROP_STATES + drops;

  const a = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => (i === j ? 1 : 0)));
  const cost = new Array<number>(size).fill(0);
  const major = new Array<number>(size).fill(0);
  for (let star = low; star < to; star++) {
    for (let drops = 0; drops < DROP_STATES; drops++) {
      const i = index(star, drops);
      cost[i] = attemptCost(star, prices, opts, isGuaranteed(drops));
      for (const t of outcomes(star, drops, opts)) {
        if (t.major) major[i] += t.p;
        if (t.star < to) a[i][index(t.star, t.drops)] -= t.p;
      }
    }
  }

  const start = index(from, 0);
  const [costs, attempts, majors] = solve(a, [cost, new Array<number>(size).fill(1), major]);
  const transposed = a.map((_, i) => a.map((row) => row[i]));
  const [visits] = solve(transposed, [a.map((_, i) => (i === start ? 1 : 0))]);

  const attemptsAt: Record<number, number> = {};
  for (let star = low; star < to; star++) {
    let sum = 0;
    for (let drops = 0; drops < DROP_STATES; drops++) sum += visits[index(star, drops)];
    // unreachable states come out as 0 up to rounding
    if (sum > 1e-12) attemptsAt[star] = sum;
  }
  return { cost: costs[start], attempts: attempts[start], majorFailures: majors[start], attemptsAt };
}
