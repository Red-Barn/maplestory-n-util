import "server-only";

import { unstable_cache } from "next/cache";
import { MsuApiError } from "@/lib/msu";
import { toPotentialProbability, type ProbabilityQuery, type RawProbability } from "@/lib/potentialProbability";
import type { PotentialProbability } from "@/types/potentialProbability";

// Source: the "Search Probability" form on https://msu.io/maplestoryn/gamestatus/probabilityitems
// calls this endpoint. It is NOT part of the documented Open API (no key needed) and may change
// without notice. It has no CORS headers, so the browser can't call it directly — hence this proxy.
const PROBABILITY_URL = "https://msu.io/maplestoryn/api/msn/probability";
// Tables change only with game updates.
const PROBABILITY_REVALIDATE = 86400;

async function fetchProbability(cube: string, grade: string, part: string, level: number): Promise<RawProbability> {
  const url = new URL(PROBABILITY_URL);
  url.searchParams.set("cubeType", `CubeType_${cube}`);
  url.searchParams.set("gradeType", `GradeType_${grade}`);
  url.searchParams.set("partsType", `PartsType_${part}`);
  url.searchParams.set("equipLevel", String(level));
  const res = await fetch(url, { cache: "no-store" });
  const body = (await res.json().catch(() => null)) as RawProbability | null;
  if (!res.ok || !body || !Array.isArray(body.probabilityInfos)) {
    throw new MsuApiError(`msu.io 확률 조회 실패 (HTTP ${res.status})`, 502);
  }
  return body;
}

const cachedProbability = unstable_cache(fetchProbability, ["msu-probability"], {
  revalidate: PROBABILITY_REVALIDATE,
});

/** Per-line option chances for a cube, grade, part and (≤120) level. */
export async function getPotentialProbability(query: ProbabilityQuery): Promise<PotentialProbability> {
  const raw = await cachedProbability(query.cube, query.grade, query.part, query.level);
  return toPotentialProbability(raw, query);
}
