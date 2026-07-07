import { NextRequest, NextResponse } from "next/server";
import {
  getChannelVideos,
  hasApiKey,
  resolveChannel,
  YouTubeError,
  type RawVideo,
} from "@/lib/youtube";
import { computeChannelOutliers, type Scored } from "@/lib/outliers";
import { demoChannel } from "@/lib/demo";
import { cacheGet, cacheSet, clientIp, rateLimit } from "@/lib/store";
import { signVideo } from "@/lib/sign";
import type { OutlierResponse, VideoOutlier } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache live results so repeat searches cost 0 API quota.
const CACHE_TTL_SECONDS = 60 * 60 * 6; // 6 hours
// Per-IP cap on uncached (quota-spending) searches, per 24h.
const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60 * 60 * 24;

function toVideoOutlier(v: RawVideo, s: Scored): VideoOutlier {
  return {
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnail,
    channelId: v.channelId,
    channelTitle: v.channelTitle,
    views: v.views,
    publishedAt: v.publishedAt,
    durationSeconds: v.durationSeconds,
    description: v.description,
    outlierScore: s.outlierScore,
    baseline: s.baseline,
    tier: s.tier,
    modifiedZ: s.modifiedZ,
    format: s.format,
    sig: signVideo(v.id),
  };
}

/** Shorts/long-form split + age-adjusted log baseline over a channel's uploads. */
function scoreChannel(videos: RawVideo[]) {
  const { results, baseline, method } = computeChannelOutliers(videos);
  return {
    results: results.map((r) => toVideoOutlier(r.video, r.score)),
    baseline,
    method,
  };
}

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json({ error: "Enter a channel to search." }, { status: 400 });
  }

  const generatedAt = new Date().toISOString();

  // Demo mode spends no quota, so it needs no cache or rate limit.
  if (!hasApiKey()) {
    return NextResponse.json(buildDemoResponse(query, generatedAt));
  }

  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  // Bump the version when the cached payload shape changes (e.g. added sigs).
  const cacheKey = `outliers:v3:${normalized}`;

  // 1) Serve from cache — free, and doesn't consume the rate limit.
  const cached = await cacheGet(cacheKey);
  if (cached) {
    try {
      const body = JSON.parse(cached) as OutlierResponse;
      return NextResponse.json({ ...body, cached: true });
    } catch {
      // corrupt entry — fall through to a live fetch
    }
  }

  // 2) Rate-limit the expensive path (per IP), only on a cache miss.
  const rl = await rateLimit(`rl:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "You've hit today's search limit. Please try again tomorrow." },
      { status: 429 },
    );
  }

  // 3) Live fetch, then cache the result.
  try {
    const channel = await resolveChannel(query);
    const videos = await getChannelVideos(channel, 50);
    const { results, baseline, method } = scoreChannel(videos);
    const body: OutlierResponse = {
      mode: "channel",
      query,
      demo: false,
      channel: {
        id: channel.id,
        title: channel.title,
        thumbnail: channel.thumbnail,
        subscribers: channel.subscribers,
        videoCount: channel.videoCount,
        baseline,
        baselineMethod: method,
      },
      results,
      generatedAt,
    };

    await cacheSet(cacheKey, JSON.stringify(body), CACHE_TTL_SECONDS);
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof YouTubeError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status });
  }
}

function buildDemoResponse(query: string, generatedAt: string): OutlierResponse {
  const { channel, videos } = demoChannel(query);
  const { results, baseline, method } = scoreChannel(videos);
  return {
    mode: "channel",
    query,
    demo: true,
    channel: {
      id: channel.id,
      title: channel.title,
      thumbnail: channel.thumbnail,
      subscribers: channel.subscribers,
      videoCount: channel.videoCount,
      baseline,
      baselineMethod: method,
    },
    results,
    generatedAt,
    note: "Demo data — add a YOUTUBE_API_KEY to analyze real channels.",
  };
}
