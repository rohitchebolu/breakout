import { NextRequest, NextResponse } from "next/server";
import { hasApiKey, YouTubeError } from "@/lib/youtube";
import { cacheGet } from "@/lib/store";
import { categories } from "@/lib/creators";
import { refreshCategory, topOutliersCacheKey } from "@/lib/topOutliers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("category") ?? "";
  const cat = categories.find((c) => c.key === key);
  if (!cat) {
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  }

  if (!hasApiKey()) {
    return NextResponse.json({
      category: cat.key,
      results: [],
      note: "Add a YOUTUBE_API_KEY to load live breakouts.",
    });
  }

  const cached = await cacheGet(topOutliersCacheKey(cat.key));
  if (cached) {
    try {
      return NextResponse.json({ ...JSON.parse(cached), cached: true });
    } catch {
      // corrupt entry — recompute below
    }
  }

  try {
    // Cache miss → compute live and cache (the cron keeps this warm daily).
    const body = await refreshCategory(cat);
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof YouTubeError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status });
  }
}
