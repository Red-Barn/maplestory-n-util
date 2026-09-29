import type { NextRequest } from "next/server";
import { getAccountCharacters } from "@/lib/character";
import { errorResponse } from "@/lib/msu";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/accounts/[wallet]/characters">) {
  try {
    const { wallet } = await ctx.params;
    const name = req.nextUrl.searchParams.get("name")?.trim().slice(0, 32) || undefined;
    return Response.json({ characters: await getAccountCharacters(wallet, name) });
  } catch (e) {
    return errorResponse(e);
  }
}
