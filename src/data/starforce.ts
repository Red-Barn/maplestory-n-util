// Star force rules. All numbers were given by the user in issue #33 (not looked up).
// Index / key n = the attempt from n ★ to n+1 ★.

export const MAX_STAR = 25;

/** Success chance of each attempt, in %. */
export const SUCCESS_RATE: readonly number[] = [
  95, 90, 85, 85, 80, 75, 70, 65, 60, 55, // 0–9
  50, 45, 40, 35, 30, 30, 30, 30, 30, 30, // 10–19
  30, 30, 3, 2, 1, // 20–24
];

/** Major Failure = (1 − success) × n%. Stars without an entry can't major-fail. */
export const MAJOR_FAILURE_N: Readonly<Record<number, number>> = {
  12: 1,
  13: 2,
  14: 2,
  15: 3,
  16: 3,
  17: 3,
  18: 4,
  19: 4,
  20: 10,
  21: 10,
  22: 20,
  23: 30,
  24: 40,
};

/** A plain failure keeps the star at 0–10, 15 and 20; everywhere else it drops one star. */
export const keepsOnFailure = (star: number): boolean => star <= 10 || star === 15 || star === 20;

/** Star Catch multiplies the success chance (95% → 99.75%). */
export const STAR_CATCH_MULTIPLIER = 1.05;

/** Major Failure Protect: no Major Failure at these stars, for twice the price. */
export const PROTECT_MIN_STAR = 12;
export const PROTECT_MAX_STAR = 16;
export const PROTECT_COST_MULTIPLIER = 2;

/** A Major Failure always sends the item to this star. */
export const MAJOR_FAILURE_STAR = 10;

/**
 * After this many Drops in a row the next attempt succeeds for sure. Drops at every star count
 * (11 ★ included), a Keep, a Major Failure or a success resets the count, and the guaranteed
 * attempt is charged without the Protect surcharge (both confirmed by the user).
 */
export const GUARANTEE_AFTER_DROPS = 2;
