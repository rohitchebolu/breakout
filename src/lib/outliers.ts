import type { OutlierTier } from "./types";

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** Videos at/under this many seconds are treated as Shorts (separate baseline). */
export const SHORT_MAX_SECONDS = 60;

/** Videos younger than this are excluded from the *baseline* pool when possible. */
export const BASELINE_MIN_AGE_DAYS = 14;

/** Minimum mature videos needed before we trust an age-filtered baseline pool. */
export const MIN_BASELINE_SAMPLE = 4;

/** Days for a video to reach ~50% of its (early-window) view total. */
export const MATURITY_HALFLIFE_DAYS = 7;

/** Floor on the maturity fraction so brand-new videos aren't over-projected. */
export const MATURITY_FLOOR = 0.25;

/** Iglewicz–Hoaglin constant that scales MAD to an approximate std deviation. */
const MAD_TO_SIGMA = 0.6745;

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The minimum shape the math needs from a video. */
export interface VideoInput {
  views: number;
  publishedAt: string;
  durationSeconds?: number;
}

export interface Scored {
  /** Multiplier vs the baseline — the user-facing "7.3x". */
  outlierScore: number;
  /** Robust modified z-score in log space. > 3.5 == statistical outlier. */
  modifiedZ: number;
  /** The baseline (expected mature views) this was scored against. */
  baseline: number;
  format: "short" | "long";
  tier: OutlierTier;
}

export interface ScoredVideo<T> {
  video: T;
  score: Scored;
}

interface BaselineModel {
  /** Median of ln(projected views) — ln of the geometric baseline. */
  logCenter: number;
  /** Median absolute deviation in log space. */
  logMad: number;
  /** exp(logCenter): the baseline in raw views, for display. */
  baseline: number;
  sampleSize: number;
  method: string;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function median(values: number[]): number {
  const nums = values
    .filter((n) => typeof n === "number" && Number.isFinite(n))
    .sort((a, b) => a - b);
  if (nums.length === 0) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

/** Tiers are keyed off the user-facing multiplier. */
export function classifyTier(score: number): OutlierTier {
  if (score >= 10) return "mega";
  if (score >= 5) return "strong";
  if (score >= 3) return "outlier";
  if (score >= 2) return "above";
  return "normal";
}

export function isShort(durationSeconds?: number): boolean {
  return (
    typeof durationSeconds === "number" &&
    durationSeconds > 0 &&
    durationSeconds <= SHORT_MAX_SECONDS
  );
}

export function ageInDays(publishedAt: string): number {
  const t = new Date(publishedAt).getTime();
  if (Number.isNaN(t)) return 3650; // unknown date -> treat as fully mature
  return Math.max(0, (Date.now() - t) / DAY_MS);
}

/**
 * (#1) Fraction of a video's eventual views it has reached by a given age.
 * A saturating curve: ~50% by one half-life, approaching 1 within ~2 months.
 * Floored so a 1-day-old video isn't projected to an absurd multiple.
 */
export function maturityFraction(ageDays: number): number {
  if (ageDays <= 0) return MATURITY_FLOOR;
  const raw = 1 - Math.pow(2, -ageDays / MATURITY_HALFLIFE_DAYS);
  return Math.min(1, Math.max(MATURITY_FLOOR, raw));
}

/** A video's views projected forward to their estimated mature total. */
function projectedViews(video: VideoInput): number {
  const proj = video.views / maturityFraction(ageInDays(video.publishedAt));
  return Number.isFinite(proj) ? proj : video.views;
}

// ---------------------------------------------------------------------------
// Baseline model (#1 + #2)
// ---------------------------------------------------------------------------

/**
 * Builds a robust baseline for a set of same-format videos:
 *  - projects each video to mature views (#1)
 *  - takes the median + MAD of the log of those values (#2)
 * Working in log space is essential because view counts are log-normal — a
 * single viral video would wreck a plain mean/standard-deviation.
 */
function buildBaselineModel(videos: VideoInput[], label: string): BaselineModel {
  const points = videos
    .map((v) => ({ proj: projectedViews(v), age: ageInDays(v.publishedAt) }))
    .filter((p) => Number.isFinite(p.proj) && p.proj > 0);

  const mature = points.filter((p) => p.age >= BASELINE_MIN_AGE_DAYS);
  const useMature = mature.length >= MIN_BASELINE_SAMPLE;
  const pool = useMature ? mature : points;

  if (pool.length === 0) {
    return { logCenter: 0, logMad: 0, baseline: 1, sampleSize: 0, method: `no ${label} videos` };
  }

  const logs = pool.map((p) => Math.log(p.proj));
  const logCenter = median(logs);
  const logMad = median(logs.map((l) => Math.abs(l - logCenter)));
  const baseline = Math.exp(logCenter) || 1;

  const agePart = useMature ? ` older than ${BASELINE_MIN_AGE_DAYS}d` : "";
  const method = `geometric median of ${pool.length} ${label} video${
    pool.length === 1 ? "" : "s"
  }${agePart}, age-adjusted`;

  return { logCenter, logMad, baseline, sampleSize: pool.length, method };
}

function scoreAgainst(video: VideoInput, model: BaselineModel): Scored {
  const proj = projectedViews(video);
  const x = Math.log(Math.max(proj, 1));
  const outlierScore = model.baseline > 0 ? proj / model.baseline : 0;
  const modifiedZ =
    model.logMad > 0 ? (MAD_TO_SIGMA * (x - model.logCenter)) / model.logMad : 0;

  return {
    outlierScore,
    modifiedZ,
    baseline: model.baseline,
    format: isShort(video.durationSeconds) ? "short" : "long",
    tier: classifyTier(outlierScore),
  };
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/**
 * Channel mode. Splits Shorts from long-form (#3) and scores each video against
 * its own format's baseline, so a viral Short doesn't masquerade as a 90x
 * long-form outlier. Results are returned sorted by outlier score, descending.
 */
export function computeChannelOutliers<T extends VideoInput>(
  videos: T[],
): { results: ScoredVideo<T>[]; baseline: number; method: string } {
  const longs = videos.filter((v) => !isShort(v.durationSeconds));
  const shorts = videos.filter((v) => isShort(v.durationSeconds));

  const longModel = longs.length ? buildBaselineModel(longs, "long-form") : null;
  const shortModel = shorts.length ? buildBaselineModel(shorts, "Shorts") : null;
  const globalModel = buildBaselineModel(videos, "recent");

  const results = videos
    .map((video) => {
      const model = (isShort(video.durationSeconds) ? shortModel : longModel) ?? globalModel;
      return { video, score: scoreAgainst(video, model) };
    })
    .sort((a, b) => b.score.outlierScore - a.score.outlierScore);

  // Headline baseline reflects the dominant format.
  const primary = (longs.length >= shorts.length ? longModel : shortModel) ?? globalModel;
  return { results, baseline: primary.baseline, method: primary.method };
}

/**
 * Topic mode. We only have one video per (channel, result) so there's no
 * per-channel distribution to build a z-score from — but we still apply the
 * age adjustment (#1) before dividing by the channel's supplied baseline.
 */
export function scoreTopicVideo<T extends VideoInput>(
  video: T,
  channelBaseline: number,
): Scored {
  const proj = projectedViews(video);
  const baseline = channelBaseline > 0 ? channelBaseline : 1;
  const outlierScore = proj / baseline;
  return {
    outlierScore,
    modifiedZ: 0, // not available without a per-channel sample
    baseline,
    format: isShort(video.durationSeconds) ? "short" : "long",
    tier: classifyTier(outlierScore),
  };
}
