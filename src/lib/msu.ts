import "server-only";

import { unstable_cache } from "next/cache";

// MSU (MapleStory N) Open API — https://docs.msu.io/msu-open-api/introduction
// The API key must never reach the browser; only call these from Route Handlers / Server Components.

const BASE_URL = "https://openapi.msu.io/v1rc1";

export class MsuApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public traceId?: string,
  ) {
    super(message);
  }
}

type MsuEnvelope<T> =
  | { success: true; data: T; trace_id?: string }
  | { success: false; error: { code?: string; message?: string }; trace_id?: string };

type Query = Record<string, string | number | boolean | undefined>;

// Default tier is 2 RPS. Space out request starts across the whole server process: the gate lives
// on globalThis because pages and route handlers can load separate copies of this module (and
// background cache revalidation fires many requests at once). Leave headroom below the limit.
// Results are cached with unstable_cache (below), so the gate only costs time on cache misses.
const MIN_GAP_MS = 650;
const MAX_RETRIES = 3;
const gate = ((globalThis as { __msuGate?: { nextSlot: number } }).__msuGate ??= { nextSlot: 0 });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function rateGate() {
  const now = Date.now();
  const wait = Math.max(0, gate.nextSlot - now);
  gate.nextSlot = Math.max(now, gate.nextSlot) + MIN_GAP_MS;
  if (wait > 0) await sleep(wait);
}

/** Gated fetch that backs off and retries on 429. */
async function gatedFetch(url: URL, apiKey: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    await rateGate();
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", "x-nxopen-api-key": apiKey },
      cache: "no-store",
    });
    if (res.status !== 429 || attempt >= MAX_RETRIES) return res;
    // push every queued request back too, not just this one
    gate.nextSlot = Math.max(gate.nextSlot, Date.now() + 1000 * (attempt + 1));
  }
}

async function fetchUncached<T>(path: string, query: Query): Promise<T> {
  const apiKey = process.env.MSU_API_KEY;
  if (!apiKey) throw new MsuApiError("MSU_API_KEY 환경변수가 설정되지 않았습니다.", 500);

  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await gatedFetch(url, apiKey);

  let body: MsuEnvelope<T> | undefined;
  try {
    body = (await res.json()) as MsuEnvelope<T>;
  } catch {
    // non-JSON error page
  }

  if (!res.ok || !body || !body.success) {
    const err = body && !body.success ? body.error : undefined;
    const message =
      res.status === 429
        ? "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
        : err?.message ?? `MSU API 오류 (HTTP ${res.status})`;
    throw new MsuApiError(message, res.status === 200 ? 502 : res.status, body?.trace_id);
  }
  return body.data;
}

// One cached wrapper per revalidate period; path and query are part of the cache key.
const cachedByTtl = new Map<number, (path: string, query: Query) => Promise<unknown>>();

export function msuFetch<T>(path: string, query: Query = {}, revalidate = 60): Promise<T> {
  let cached = cachedByTtl.get(revalidate);
  if (!cached) {
    cached = unstable_cache(fetchUncached, ["msu", String(revalidate)], { revalidate });
    cachedByTtl.set(revalidate, cached);
  }
  return cached(path, query) as Promise<T>;
}

export function errorResponse(e: unknown): Response {
  if (e instanceof MsuApiError) {
    return Response.json({ error: e.message, traceId: e.traceId }, { status: e.status });
  }
  console.error(e);
  return Response.json({ error: "알 수 없는 서버 오류" }, { status: 500 });
}
