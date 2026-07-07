import { NextRequest, NextResponse } from "next/server";
import { categories } from "@/lib/creators";
import { refreshCategory } from "@/lib/topOutliers";
import { hasApiKey } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Sequential sweep of 6 categories (respects Gemini free-tier rate limits).
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Vercel adds `Authorization: Bearer <CRON_SECRET>` to cron requests when the
  // env var is set — verify it so the endpoint can't be triggered by anyone.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasApiKey()) {
    return NextResponse.json({ ok: false, note: "No YOUTUBE_API_KEY configured." });
  }

  // Sequential (not parallel) to avoid bursting the YouTube quota / Gemini RPM.
  const refreshed: Record<string, string> = {};
  for (const cat of categories) {
    try {
      const body = await refreshCategory(cat);
      refreshed[cat.key] = `${body.results.length} breakouts${body.trend ? " + trend" : ""}`;
    } catch (err) {
      refreshed[cat.key] = `error: ${err instanceof Error ? err.message : "failed"}`;
    }
  }

  return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString(), refreshed });
}
