import { NextRequest, NextResponse } from "next/server";
import { analysisConfigured, analyzeVideo } from "@/lib/analysis";
import { fetchTranscript } from "@/lib/transcript";
import { cacheGet, cacheSet, rateLimit } from "@/lib/store";
import type { Lang } from "@/lib/i18n";
import type { VideoOutlier } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A past video's breakdown never changes — cache it for a month so each video
// is analyzed exactly once (shared across all viewers via Redis).
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
// Per-IP cap on uncached (LLM-spending) analyses, per 24h.
const RATE_LIMIT = 60;
const RATE_WINDOW_SECONDS = 60 * 60 * 24;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

export async function POST(req: NextRequest) {
  let body: { video?: Partial<VideoOutlier>; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const video = body.video;
  const lang: Lang = body.lang === "te" ? "te" : "en";
  if (!video?.id || !/^[A-Za-z0-9_-]{11}$/.test(video.id)) {
    return NextResponse.json({ error: "Invalid video." }, { status: 400 });
  }

  // No provider configured → tell the UI to show a graceful fallback (not an error).
  if (!analysisConfigured()) {
    return NextResponse.json({ note: "unconfigured" });
  }

  const cacheKey = `analysis:v1:${lang}:${video.id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    try {
      return NextResponse.json({ analysis: JSON.parse(cached), cached: true });
    } catch {
      // corrupt entry — fall through and recompute
    }
  }

  // Rate-limit only the expensive path, on a cache miss.
  const rl = await rateLimit(`analyze:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "You've hit today's analysis limit. Please try again tomorrow." },
      { status: 429 },
    );
  }

  try {
    const transcript = await fetchTranscript(video.id);
    const analysis = await analyzeVideo(
      {
        title: video.title ?? "",
        description: video.description,
        channelTitle: video.channelTitle ?? "",
        views: video.views ?? 0,
        baseline: video.baseline ?? 0,
        outlierScore: video.outlierScore ?? 0,
        format: video.format,
        publishedAt: video.publishedAt ?? "",
        transcript,
      },
      lang,
    );

    await cacheSet(cacheKey, JSON.stringify(analysis), CACHE_TTL_SECONDS);
    return NextResponse.json({ analysis, transcriptUsed: Boolean(transcript) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
