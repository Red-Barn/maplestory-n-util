import { attemptCost, isGuaranteed, outcomes, type StarforceOptions, type StarPrices } from "./odds";

// Monte Carlo runs of the same chain as expected.ts, for the spread (lucky / median / unlucky)
// that the exact expectation doesn't show.

export type Rng = () => number;

/** Small seeded PRNG (mulberry32), so tests and reruns are reproducible. */
export function seededRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Run = { cost: number; attempts: number; majorFailures: number };

/** One item taken from `from` to `to` stars. */
export function simulateRun(from: number, to: number, prices: StarPrices, opts: StarforceOptions, rng: Rng): Run {
  const run: Run = { cost: 0, attempts: 0, majorFailures: 0 };
  let star = from;
  let drops = 0;
  while (star < to) {
    run.cost += attemptCost(star, prices, opts, isGuaranteed(drops));
    run.attempts++;
    const possible = outcomes(star, drops, opts);
    let roll = rng();
    // falls through to the last outcome if rounding leaves a sliver
    let next = possible[possible.length - 1];
    for (const t of possible) {
      if (roll < t.p) {
        next = t;
        break;
      }
      roll -= t.p;
    }
    if (next.major) run.majorFailures++;
    star = next.star;
    drops = next.drops;
  }
  return run;
}

export function simulateRuns(
  from: number,
  to: number,
  prices: StarPrices,
  opts: StarforceOptions,
  runs: number,
  rng: Rng,
): Run[] {
  return Array.from({ length: runs }, () => simulateRun(from, to, prices, opts, rng));
}

export type Spread = { mean: number; p10: number; median: number; p90: number };
export type Summary = { runs: number; cost: Spread; attempts: Spread; majorFailures: Spread };

function spread(values: number[]): Spread {
  const sorted = [...values].sort((x, y) => x - y);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  const mean = sorted.length ? sorted.reduce((sum, v) => sum + v, 0) / sorted.length : 0;
  return { mean, p10: at(0.1), median: at(0.5), p90: at(0.9) };
}

export const summarize = (runs: Run[]): Summary => ({
  runs: runs.length,
  cost: spread(runs.map((r) => r.cost)),
  attempts: spread(runs.map((r) => r.attempts)),
  majorFailures: spread(runs.map((r) => r.majorFailures)),
});
