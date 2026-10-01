import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/msu";
import { parseProbabilityQuery } from "@/lib/potentialProbability";
import { getPotentialProbability } from "@/lib/potentialProbabilityFetch";

// GET /api/potential/probability?cube=RED&grade=LEGENDARY&part=WEAPON&level=150
export async function GET(req: NextRequest) {
  const parsed = parseProbabilityQuery(req.nextUrl.searchParams);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    return Response.json(await getPotentialProbability(parsed.query));
  } catch (e) {
    return errorResponse(e);
  }
}
