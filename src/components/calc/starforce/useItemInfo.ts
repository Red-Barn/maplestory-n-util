"use client";

import { useEffect, useState } from "react";
import type { ItemInfo } from "@/types/items";

type Loaded = { itemId: number; info?: ItemInfo; error?: string };

/** One item's metadata (max star force, icon, ...) from GET /api/items/{itemId}. */
export function useItemInfo(itemId: number | undefined) {
  const [loaded, setLoaded] = useState<Loaded>();

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    fetch(`/api/items/${itemId}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "아이템 정보를 불러오지 못했습니다.");
        return body as ItemInfo;
      })
      .then((info) => !cancelled && setLoaded({ itemId, info }))
      .catch((e: unknown) => {
        const error = e instanceof Error ? e.message : "아이템 정보를 불러오지 못했습니다.";
        if (!cancelled) setLoaded({ itemId, error });
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const current = itemId && loaded?.itemId === itemId ? loaded : undefined;
  return { info: current?.info, error: current?.error, loading: !!itemId && !current };
}
