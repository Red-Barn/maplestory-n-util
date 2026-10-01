import type { StarPrices } from "./odds";

/**
 * The highest target star reachable from `from` while every attempt on the way has a price.
 * The price API returns 0 for stars an item can't be enhanced at yet (e.g. 22–24 ★ while the
 * item metadata says 25), so the target is capped by both. Returns `from` if the first attempt
 * has no price.
 */
export function pricedUpTo(prices: StarPrices, from: number, maxStar: number): number {
  let star = from;
  while (star < maxStar && (prices[star] ?? 0) > 0) star++;
  return star;
}
