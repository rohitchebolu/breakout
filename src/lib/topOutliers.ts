// Shared "top breakouts by category" compute — used by both the on-demand API
// route and the daily cron. Discovers a category's top Telugu channels, scores
// their outliers, and derives the trending topic (both languages) via Gemini.

import {
  getChannelVideos,
  getChannelsBatch,
  searchChannels,
  type RawVideo,
} from "@/lib/youtube";
import { computeChannelOutliers, type Scored } from "@/lib/outliers";
import { analysisConfigured, findCategoryTrend, type CategoryTrend } from "@/lib/analysis";
import { cacheSet } from "@/lib/store";
import { signVideo } from "@/lib/sign";
import type { Category } from "@/lib/creators";
import type { VideoOutlier } from "@/lib/types";

export const TOPOUTLIERS_TTL_SECONDS = 60 * 60 * 24; // 24h
const CHANNELS_PER_CATEGORY = 6;
const OUTLIERS_PER_CHANNEL = 4;
const MIN_SCORE = 3;
const TOTAL = 15;

export interface TopOutliersBody {
  category: string;
  results: VideoOutlier[];
  trend?: { en: CategoryTrend; te: CategoryTrend };
  generatedAt: string;
}

/** v4 adds per-result sigs (on top of Groq trends); bump forces a clean recompute. */
export function topOutliersCacheKey(catKey: string): string {
  return `topoutliers:v4:${catKey}`;
}

function toVideoOutlier(v: RawVideo, s: Scored, channelThumbnail?: string): VideoOutlier {
  return {
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnail,
    channelId: v.channelId,
    channelTitle: v.channelTitle,
    channelThumbnail,
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

/** Compute a category's breakouts + trend live (no caching). */
export async function computeCategoryBreakouts(cat: Category): Promise<TopOutliersBody> {
  // Discover the top Telugu channels for this category (by subscribers).
  const channelIds = await searchChannels(cat.query, 15);
  const channels = (await getChannelsBatch(channelIds))
    .filter((c) => c.uploadsPlaylistId)
    .sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0))
    .slice(0, CHANNELS_PER_CATEGORY);

  // Score each channel's outliers in parallel; keep the strongest few.
  const perChannel = await Promise.all(
    channels.map(async (ch) => {
      try {
        const videos = await getChannelVideos(ch, 30);
        const { results } = computeChannelOutliers(videos);
        return results
          .filter((r) => r.score.outlierScore >= MIN_SCORE)
          .slice(0, OUTLIERS_PER_CHANNEL)
          .map((r) => toVideoOutlier(r.video, r.score, ch.thumbnail));
      } catch {
        return [];
      }
    }),
  );

  const results = perChannel
    .flat()
    .sort((a, b) => b.outlierScore - a.outlierScore)
    .slice(0, TOTAL);

  // Derive the trending topic (both languages) from the live breakouts.
  let trend: { en: CategoryTrend; te: CategoryTrend } | undefined;
  if (results.length > 0 && analysisConfigured()) {
    const titles = results.slice(0, 15).map((r) => r.title);
    try {
      const t = await findCategoryTrend(cat.label, titles);
      if (t.en.topic || t.te.topic) trend = t;
    } catch {
      // trend unavailable — ship the breakouts without it
    }
  }

  return { category: cat.key, results, trend, generatedAt: new Date().toISOString() };
}

/** Compute a category and write it to the 24h cache. Returns the fresh body. */
export async function refreshCategory(cat: Category): Promise<TopOutliersBody> {
  const body = await computeCategoryBreakouts(cat);
  await cacheSet(topOutliersCacheKey(cat.key), JSON.stringify(body), TOPOUTLIERS_TTL_SECONDS);
  return body;
}
