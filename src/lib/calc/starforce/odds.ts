import {
  GUARANTEE_AFTER_DROPS,
  keepsOnFailure,
  MAJOR_FAILURE_N,
  MAJOR_FAILURE_STAR,
  PROTECT_COST_MULTIPLIER,
  PROTECT_MAX_STAR,
  PROTECT_MIN_STAR,
  STAR_CATCH_MULTIPLIER,
  SUCCESS_RATE,
} from "@/data/starforce";

export type StarforceOptions = {
  /** success chance × 1.05 */
  starCatch: boolean;
  /** Major Failure Protect at 12–16 ★ (no Major Failure, double price) */
  protect: boolean;
};

/** Price of one attempt at each star in NESO (key n = n ★ → n+1 ★), as in EnhancementPrices. */
export type StarPrices = Record<number, number>;

/** Chances of one attempt, as fractions that add up to 1. */
export type Odds = { success: number; keep: number; drop: number; major: number };

export const isProtected = (star: number, opts: StarforceOptions): boolean =>
  opts.protect && star >= PROTECT_MIN_STAR && star <= PROTECT_MAX_STAR;

/** The next attempt is a sure success after this many Drops in a row. */
export const isGuaranteed = (drops: number): boolean => drops >= GUARANTEE_AFTER_DROPS;

export function starOdds(star: number, opts: StarforceOptions, guaranteed = false): Odds {
  if (guaranteed) return { success: 1, keep: 0, drop: 0, major: 0 };
  const success = Math.min(1, ((SUCCESS_RATE[star] ?? 0) / 100) * (opts.starCatch ? STAR_CATCH_MULTIPLIER : 1));
  const n = isProtected(star, opts) ? 0 : (MAJOR_FAILURE_N[star] ?? 0);
  const major = ((1 - success) * n) / 100;
  const rest = 1 - success - major;
  return keepsOnFailure(star) ? { success, keep: rest, drop: 0, major } : { success, keep: 0, drop: rest, major };
}

/** Price of one attempt. The guaranteed attempt after two Drops is charged without Protect. */
export function attemptCost(star: number, prices: StarPrices, opts: StarforceOptions, guaranteed = false): number {
  const price = prices[star] ?? 0;
  return !guaranteed && isProtected(star, opts) ? price * PROTECT_COST_MULTIPLIER : price;
}

export type Outcome = { p: number; star: number; drops: number; major: boolean };

/** Where one attempt at (star, Drops in a row) can lead, with the chance of each outcome. */
export function outcomes(star: number, drops: number, opts: StarforceOptions): Outcome[] {
  const o = starOdds(star, opts, isGuaranteed(drops));
  return [
    { p: o.success, star: star + 1, drops: 0, major: false },
    { p: o.keep, star, drops: 0, major: false },
    { p: o.drop, star: star - 1, drops: drops + 1, major: false },
    { p: o.major, star: MAJOR_FAILURE_STAR, drops: 0, major: true },
  ].filter((t) => t.p > 0);
}
