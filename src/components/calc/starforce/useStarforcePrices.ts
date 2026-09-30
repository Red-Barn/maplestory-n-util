"use client";

import { useEffect, useState } from "react";
import type { EnhancementPrices } from "@/types/enhancement";

type Loaded = { request: string; prices?: EnhancementPrices; error?: string };

/**
 * Star force prices of one item from GET /api/enhancement/{itemId}. Prices move every minute, so
 * `reload` fetches them again (the server caches for 60 seconds).
 */
export function useStarforcePrices(itemId: number) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded>();
  const request = `${itemId}:${attempt}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/enhancement/${itemId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "가격을 불러오지 못했습니다.");
        return body as EnhancementPrices;
      })
      .then((prices) => !cancelled && setLoaded({ request, prices }))
      .catch((e: unknown) => {
        const error = e instanceof Error ? e.message : "가격을 불러오지 못했습니다.";
        if (!cancelled) setLoaded({ request, error });
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, request]);

  const current = loaded?.request === request ? loaded : undefined;
  return {
    // keeps showing the previous prices of the same item while reloading
    prices: current?.prices ?? (loaded?.prices?.itemId === itemId ? loaded.prices : undefined),
    error: current?.error,
    loading: !current,
    reload: () => setAttempt((n) => n + 1),
  };
}
