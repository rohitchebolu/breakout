import { NextRequest, NextResponse } from "next/server";
import { hasApiKey, YouTubeError } from "@/lib/youtube";
import { cacheGet, clientIp, rateLimit } from "@/lib/store";
import { categories } from "@/lib/creators";
import { refreshCategory, topOutliersCacheKey } from "@/lib/topOutliers";
import { trackBreakouts } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP cap on the expensive (uncached) recompute path, per 24h. Cache hits
// are unlimited; only cache misses (which spend YouTube + LLM quota) count.
const RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 60 * 60 * 24;

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("category") ?? "";
  const cat = categories.find((c) => c.key === key);
  if (!cat) {
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  }

  trackBreakouts(cat.key);

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

  // Rate-limit the expensive recompute path (per IP); cache hits above are free.
  const rl = await rateLimit(`topout:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests — please try again later." },
      { status: 429 },
    );
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
