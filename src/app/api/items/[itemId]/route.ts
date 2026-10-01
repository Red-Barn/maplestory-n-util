import type { NextRequest } from "next/server";
import { getItemInfo } from "@/lib/itemSearch";
import { errorResponse } from "@/lib/msu";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/items/[itemId]">) {
  try {
    const { itemId } = await ctx.params;
    return Response.json(await getItemInfo(Number(itemId)));
  } catch (e) {
    return errorResponse(e);
  }
}
