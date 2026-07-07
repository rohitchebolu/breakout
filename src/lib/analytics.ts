// Private, self-hosted usage analytics — plain Upstash counters (no cookies, no
// PII, no third party). Tracking is fire-and-forget so it never adds latency or
// breaks a request; reads power the token-gated /stats dashboard.

import { bumpCounters, readCounters } from "./store";
import { categories } from "./creators";

const day = () => new Date().toISOString().slice(0, 10);

export function trackSearch(): void {
  void bumpCounters(["an:t:search", `an:d:${day()}:search`]);
}

export function trackAnalyze(lang: "en" | "te"): void {
  void bumpCounters(["an:t:analyze", `an:d:${day()}:analyze`, `an:lang:${lang}`]);
}

export function trackBreakouts(category: string): void {
  void bumpCounters(["an:t:breakouts", `an:d:${day()}:breakouts`, `an:cat:${category}`]);
}

export interface Analytics {
  totals: { search: number; analyze: number; breakouts: number };
  byCategory: { key: string; label: string; count: number }[];
  byLang: { en: number; te: number };
  daily: { date: string; search: number; analyze: number; breakouts: number }[];
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(now - i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

export async function getAnalytics(): Promise<Analytics> {
  const days = lastNDays(14);
  const catKeys = categories.map((c) => `an:cat:${c.key}`);
  const keys = [
    "an:t:search",
    "an:t:analyze",
    "an:t:breakouts",
    "an:lang:en",
    "an:lang:te",
    ...catKeys,
    ...days.map((d) => `an:d:${d}:search`),
    ...days.map((d) => `an:d:${d}:analyze`),
    ...days.map((d) => `an:d:${d}:breakouts`),
  ];
  const v = await readCounters(keys);

  const catStart = 5;
  const dailyStart = catStart + categories.length;
  const n = days.length;

  return {
    totals: { search: v[0], analyze: v[1], breakouts: v[2] },
    byLang: { en: v[3], te: v[4] },
    byCategory: categories.map((c, j) => ({ key: c.key, label: c.label, count: v[catStart + j] })),
    daily: days.map((d, j) => ({
      date: d,
      search: v[dailyStart + j],
      analyze: v[dailyStart + n + j],
      breakouts: v[dailyStart + 2 * n + j],
    })),
  };
}
