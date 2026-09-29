import "server-only";

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

export async function msuFetch<T>(path: string, query: Query = {}, revalidate = 60): Promise<T> {
  const apiKey = process.env.MSU_API_KEY;
  if (!apiKey) throw new MsuApiError("MSU_API_KEY 환경변수가 설정되지 않았습니다.", 500);

  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", "x-nxopen-api-key": apiKey },
    next: { revalidate },
  });

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

export function errorResponse(e: unknown): Response {
  if (e instanceof MsuApiError) {
    return Response.json({ error: e.message, traceId: e.traceId }, { status: e.status });
  }
  console.error(e);
  return Response.json({ error: "알 수 없는 서버 오류" }, { status: 500 });
}
