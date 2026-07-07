// Shared types used across the API route and the UI.

export type SearchMode = "channel" | "topic";

// Ordered from least to most exceptional.
export type OutlierTier = "normal" | "above" | "outlier" | "strong" | "mega";

export interface VideoOutlier {
  id: string;
  title: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  views: number;
  publishedAt: string; // ISO 8601
  durationSeconds?: number;
  /** How many times the channel's baseline this video's views are. */
  outlierScore: number;
  /** The baseline (expected views) this score was measured against. */
  baseline: number;
  tier: OutlierTier;
  /** Robust modified z-score (log space). > 3.5 == statistical outlier. Channel mode only. */
  modifiedZ?: number;
  /** Whether the video was scored as a Short or long-form. */
  format?: "short" | "long";
  /** Full video description (for the swipe-file modal). */
  description?: string;
  /** Channel avatar — shown on cross-channel feeds (e.g. Top breakouts). */
  channelThumbnail?: string;
}

export interface ChannelInfo {
  id: string;
  title: string;
  thumbnail?: string;
  subscribers?: number;
  videoCount?: number;
  /** Median views used as the outlier baseline. */
  baseline: number;
  /** Human-readable explanation of how the baseline was derived. */
  baselineMethod: string;
}

export interface OutlierResponse {
  mode: SearchMode;
  query: string;
  /** True when results are the built-in sample set (no API key configured). */
  demo: boolean;
  /** Present in channel mode. */
  channel?: ChannelInfo;
  results: VideoOutlier[];
  generatedAt: string;
  note?: string;
  /** True when served from the cache (no API quota spent). */
  cached?: boolean;
}

export interface ApiError {
  error: string;
}
