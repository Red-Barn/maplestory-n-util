import type { NextRequest } from "next/server";
import { getCharacterBundle } from "@/lib/character";
import { errorResponse } from "@/lib/msu";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/characters/[assetKey]">) {
  try {
    const { assetKey } = await ctx.params;
    return Response.json(await getCharacterBundle(assetKey));
  } catch (e) {
    return errorResponse(e);
  }
}
