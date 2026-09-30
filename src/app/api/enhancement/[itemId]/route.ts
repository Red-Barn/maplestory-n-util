import type { NextRequest } from "next/server";
import { getEnhancementPrices } from "@/lib/enhancement";
import { errorResponse } from "@/lib/msu";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/enhancement/[itemId]">) {
  try {
    const { itemId } = await ctx.params;
    return Response.json(await getEnhancementPrices(Number(itemId)));
  } catch (e) {
    return errorResponse(e);
  }
}
