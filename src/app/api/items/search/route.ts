import type { NextRequest } from "next/server";
import { searchItems } from "@/lib/itemSearch";
import { errorResponse } from "@/lib/msu";

// GET /api/items/search?q=<name part>[&all=1] — equipment only unless all=1
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const items = await searchItems(params.get("q") ?? "", { equipmentOnly: params.get("all") !== "1" });
    return Response.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}
