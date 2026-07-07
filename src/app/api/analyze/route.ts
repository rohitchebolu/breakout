import { NextRequest, NextResponse } from "next/server";
import { analysisConfigured, analyzeVideo } from "@/lib/analysis";
import { fetchTranscript } from "@/lib/transcript";
import { getVideoById, hasApiKey } from "@/lib/youtube";
import { isShort } from "@/lib/outliers";
import { cacheGet, cacheSet, clientIp, consumeLlmBudget, rateLimit } from "@/lib/store";
import { verifyVideoSig } from "@/lib/sign";
import { trackAnalyze } from "@/lib/analytics";
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

  // Only analyze videos we actually surfaced (valid HMAC sig) — stops an attacker
  // from forcing analyses of arbitrary video IDs to drain quota.
  if (!verifyVideoSig(video.id, video.sig)) {
    return NextResponse.json({ error: "This video can't be analyzed here." }, { status: 403 });
  }

  // No provider configured → tell the UI to show a graceful fallback (not an error).
  if (!analysisConfigured()) {
    return NextResponse.json({ note: "unconfigured" });
  }

  const cacheKey = `analysis:v1:${lang}:${video.id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    try {
      const analysis = JSON.parse(cached);
      trackAnalyze(lang);
      return NextResponse.json({ analysis, cached: true });
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

  // Global daily backstop across ALL callers — protects the provider quota from
  // a distributed flood (and any runaway) regardless of per-IP limits.
  if (!(await consumeLlmBudget())) {
    return NextResponse.json({ note: "busy" });
  }

  try {
    // Re-fetch the video's REAL title/description by ID. The cache is keyed by
    // video ID, so trusting client-supplied text would let anyone poison the
    // breakdown other users see. Numbers (baseline/outlierScore) are computed
    // values that can't carry prompt injection, so those we take as given.
    const real = hasApiKey() ? await getVideoById(video.id) : null;
    if (hasApiKey() && !real) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }

    const transcript = await fetchTranscript(video.id);
    const analysis = await analyzeVideo(
      {
        title: real?.title ?? video.title ?? "",
        description: real ? real.description : video.description,
        channelTitle: real?.channelTitle ?? video.channelTitle ?? "",
        views: real?.views ?? video.views ?? 0,
        baseline: video.baseline ?? 0,
        outlierScore: video.outlierScore ?? 0,
        format: real ? (isShort(real.durationSeconds) ? "short" : "long") : video.format,
        publishedAt: real?.publishedAt ?? video.publishedAt ?? "",
        transcript,
      },
      lang,
    );

    await cacheSet(cacheKey, JSON.stringify(analysis), CACHE_TTL_SECONDS);
    trackAnalyze(lang);
    return NextResponse.json({ analysis, transcriptUsed: Boolean(transcript) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
