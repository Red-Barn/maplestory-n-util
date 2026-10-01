"use client";

import { useEffect, useState } from "react";
import { itemIconUrl, MIN_QUERY_LENGTH } from "@/lib/items";
import type { ItemRef } from "@/types/items";

const DEBOUNCE_MS = 300;

/**
 * Find an item by (part of) its name and pick it. Searches equipment only unless `all` is set.
 * Results come from GET /api/items/search (the API's own item search, cached for a day).
 */
export default function ItemPicker(props: {
  onSelect: (item: ItemRef) => void;
  /** include cosmetics, pets and other non-equipment items */
  all?: boolean;
  placeholder?: string;
}) {
  const { all } = props;
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ItemRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);

  const q = query.trim();
  useEffect(() => {
    if (q.length < MIN_QUERY_LENGTH) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(undefined);
      try {
        const res = await fetch(`/api/items/search?q=${encodeURIComponent(q)}${all ? "&all=1" : ""}`, {
          signal: ctrl.signal,
        });
        const body = (await res.json().catch(() => null)) as { items?: ItemRef[]; error?: string } | null;
        if (!res.ok || !body?.items) throw new Error(body?.error ?? `검색에 실패했습니다 (HTTP ${res.status}).`);
        setItems(body.items);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
        setItems([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, all]);

  const searching = q.length >= MIN_QUERY_LENGTH;
  const shown = searching ? items : [];

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={props.placeholder ?? `아이템 이름 (${MIN_QUERY_LENGTH}글자 이상, 영문)`}
        spellCheck={false}
        aria-label="아이템 이름으로 찾기"
        className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-sm focus:border-orange-500 focus:outline-none dark:border-white/20"
      />
      {open && searching && (
        <div className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded border border-black/15 bg-[var(--background)] shadow-lg dark:border-white/20">
          {loading && shown.length === 0 && <p className="px-3 py-2 text-xs text-zinc-500">찾는 중…</p>}
          {error && <p className="px-3 py-2 text-xs text-red-600">{error}</p>}
          {!loading && !error && shown.length === 0 && (
            <p className="px-3 py-2 text-xs text-zinc-500">찾는 아이템이 없습니다.</p>
          )}
          <ul>
            {shown.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    props.onSelect(item);
                    setQuery(item.name);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- external item icons */}
                  <img src={itemIconUrl(item.id)} alt="" className="h-6 w-6 object-contain" />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">{item.id}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
