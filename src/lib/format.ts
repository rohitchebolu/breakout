// Presentation helpers. Pure and safe to import on the client.
// Numbers use the Indian system (thousand / lakh / crore) since this is a
// Telugu-region product; words are localized per language.

import type { Lang } from "./i18n";

const UNITS: Record<Lang, { cr: string; lakh: string; k: string }> = {
  en: { cr: " Cr", lakh: " Lakh", k: "K" },
  te: { cr: " కోట్లు", lakh: " లక్షలు", k: " వేలు" },
};

export function formatCompact(n: number, lang: Lang = "en"): string {
  if (!Number.isFinite(n)) return "0";
  const u = UNITS[lang];
  const abs = Math.abs(n);
  const trim = (v: number) => String(Math.round(v * 10) / 10);
  if (abs >= 1e7) return trim(n / 1e7) + u.cr;
  if (abs >= 1e5) return trim(n / 1e5) + u.lakh;
  if (abs >= 1e3) return trim(n / 1e3) + u.k;
  return String(Math.round(n));
}

export function formatNumber(n: number, lang: Lang = "en"): string {
  return Math.round(n).toLocaleString(lang === "te" ? "en-IN" : "en-US");
}

/** Formats an outlier multiplier, e.g. 7.34 -> "7.3x", 13.2 -> "13x". Language-agnostic. */
export function formatMultiplier(x: number): string {
  if (!Number.isFinite(x) || x <= 0) return "—";
  if (x >= 10) return `${Math.round(x)}x`;
  return `${(Math.round(x * 10) / 10).toFixed(1)}x`;
}

interface AgoConfig {
  units: { limit: number; s: string; p: string }[];
  suffix: string;
  now: string;
}

const AGO: Record<Lang, AgoConfig> = {
  en: {
    units: [
      { limit: 31_536_000, s: "year", p: "years" },
      { limit: 2_592_000, s: "month", p: "months" },
      { limit: 604_800, s: "week", p: "weeks" },
      { limit: 86_400, s: "day", p: "days" },
      { limit: 3_600, s: "hour", p: "hours" },
      { limit: 60, s: "minute", p: "minutes" },
    ],
    suffix: "ago",
    now: "just now",
  },
  te: {
    units: [
      { limit: 31_536_000, s: "సంవత్సరం", p: "సంవత్సరాల" },
      { limit: 2_592_000, s: "నెల", p: "నెలల" },
      { limit: 604_800, s: "వారం", p: "వారాల" },
      { limit: 86_400, s: "రోజు", p: "రోజుల" },
      { limit: 3_600, s: "గంట", p: "గంటల" },
      { limit: 60, s: "నిమిషం", p: "నిమిషాల" },
    ],
    suffix: "క్రితం",
    now: "ఇప్పుడే",
  },
};

export function timeAgo(iso: string, lang: Lang = "en"): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, (Date.now() - then) / 1000);
  const conf = AGO[lang];
  for (const u of conf.units) {
    const v = Math.floor(secs / u.limit);
    if (v >= 1) return `${v} ${v > 1 ? u.p : u.s} ${conf.suffix}`;
  }
  return conf.now;
}

export function formatDuration(totalSeconds?: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "";
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}
