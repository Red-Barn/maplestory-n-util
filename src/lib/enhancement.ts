import "server-only";

import { MsuApiError, msuFetch } from "@/lib/msu";
import type { EnhancementPrices } from "@/types/enhancement";

// GET /enhancement/items/{itemId}/dynamicprice — star force and cube prices of one equipment
// item. Both are per item: the star force map is keyed by the current star ("0".."24"), the
// potential map by cube item ID. Prices are NESO in 18-decimal base units and change every minute.

type Price = { currentPrice?: { price: string; startDate?: string } };
type DynamicPriceResponse = {
  currentPrices: { starforce?: Record<string, Price>; potential?: Record<string, Price> };
};

const NESO_DECIMALS = 1e18;
const PRICE_REVALIDATE = 60;

// Stars an item can't reach come back as a placeholder price of 0.000001 NESO, not as missing.
const PLACEHOLDER_MAX = 0.001;

/** Base units → NESO, rounded to 6 decimals; placeholder prices become 0 ("not offered"). */
export function toNeso(price: string | undefined): number {
  const neso = Math.round((Number(price ?? 0) / NESO_DECIMALS) * 1e6) / 1e6;
  return neso < PLACEHOLDER_MAX ? 0 : neso;
}

const toNesoMap = (map: Record<string, Price> | undefined): Record<number, number> =>
  Object.fromEntries(Object.entries(map ?? {}).map(([key, p]) => [Number(key), toNeso(p.currentPrice?.price)]));

export function assertItemId(itemId: number) {
  if (!Number.isInteger(itemId) || itemId <= 0) throw new MsuApiError("아이템 ID 형식이 올바르지 않습니다.", 400);
}

export async function getEnhancementPrices(itemId: number): Promise<EnhancementPrices> {
  assertItemId(itemId);
  const { currentPrices } = await msuFetch<DynamicPriceResponse>(
    `/enhancement/items/${itemId}/dynamicprice`,
    {},
    PRICE_REVALIDATE,
  );
  const first = Object.values(currentPrices.starforce ?? currentPrices.potential ?? {})[0];
  return {
    itemId,
    starforce: toNesoMap(currentPrices.starforce),
    cubes: toNesoMap(currentPrices.potential),
    asOf: first?.currentPrice?.startDate,
  };
}
