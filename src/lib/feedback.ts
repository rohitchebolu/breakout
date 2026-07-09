// User feedback — private, self-hosted, PII-free. A quick sentiment plus an
// optional note. Stored two ways: aggregate counters (so it shows up on the
// token-gated /stats dashboard) and a capped list of recent messages the owner
// can actually read. Mirrors analytics.ts: no cookies, no third party, and
// best-effort writes that never block or break a request.

import { bumpCounters, pushList, readCounters, readList } from "./store";

export type Sentiment = "love" | "meh" | "issue";
export const SENTIMENTS: Sentiment[] = ["love", "meh", "issue"];

export function isSentiment(v: unknown): v is Sentiment {
  return typeof v === "string" && (SENTIMENTS as string[]).includes(v);
}

export interface FeedbackItem {
  sentiment: Sentiment | null;
  message: string;
  lang: string;
  path: string;
  at: string; // ISO timestamp
}

export const MESSAGE_MAX = 1000;

const LIST_KEY = "fb:list:v1";
const LIST_CAP = 500; // hard ceiling on stored messages — old ones roll off

const day = () => new Date().toISOString().slice(0, 10);

/** Persist one feedback submission. Best-effort; never throws. */
export async function saveFeedback(item: FeedbackItem): Promise<void> {
  const counters = ["an:t:feedback", `an:d:${day()}:feedback`];
  if (item.sentiment) counters.push(`an:fb:${item.sentiment}`);
  void bumpCounters(counters);
  await pushList(LIST_KEY, JSON.stringify(item), LIST_CAP);
}

export interface FeedbackSummary {
  total: number;
  bySentiment: { love: number; meh: number; issue: number };
  recent: FeedbackItem[];
}

/** Read feedback for the private /stats dashboard. */
export async function getFeedbackSummary(recentLimit = 50): Promise<FeedbackSummary> {
  const [counts, raw] = await Promise.all([
    readCounters(["an:t:feedback", "an:fb:love", "an:fb:meh", "an:fb:issue"]),
    readList(LIST_KEY, recentLimit),
  ]);
  const recent = raw
    .map((s) => {
      try {
        return JSON.parse(s) as FeedbackItem;
      } catch {
        return null;
      }
    })
    .filter((x): x is FeedbackItem => x !== null);

  return {
    total: counts[0],
    bySentiment: { love: counts[1], meh: counts[2], issue: counts[3] },
    recent,
  };
}
