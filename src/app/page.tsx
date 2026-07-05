"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Info, SlidersHorizontal } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { StatsSummary } from "@/components/StatsSummary";
import { ResultsGrid, SkeletonGrid } from "@/components/ResultsGrid";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Dropdown } from "@/components/Dropdown";
import { useLang } from "@/components/LanguageProvider";
import { tierLabels, videosCount } from "@/lib/i18n";
import { tierStyles } from "@/lib/tiers";
import type { OutlierResponse } from "@/lib/types";

type SortKey = "outlier" | "views" | "recent";
type FormatFilter = "all" | "long" | "short";

const MIN_VALUES = [0, 2, 3, 5, 10];

export default function Home() {
  const { d, lang } = useLang();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<OutlierResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minMult, setMinMult] = useState(0);
  const [sort, setSort] = useState<SortKey>("outlier");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const didInit = useRef(false);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `?q=${encodeURIComponent(trimmed)}`);
    }
    try {
      const res = await fetch(`/api/outliers?q=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Something went wrong.");
        setData(null);
      } else {
        setData(json as OutlierResponse);
        setFormatFilter("all"); // available formats vary per search
      }
    } catch {
      setError("Network error — please try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore state from the URL on first load (shareable result links).
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      // One-time restore from a shared URL. Seeding state on mount is intentional
      // and SSR-safe (a lazy initializer reading window would cause a hydration mismatch).
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setQuery(q);
      runSearch(q);
    }
  }, [runSearch]);

  const pickExample = (q: string) => {
    setQuery(q);
    runSearch(q);
  };

  // Clicking the logo returns to the initial (empty) state.
  const reset = useCallback(() => {
    setQuery("");
    setData(null);
    setError(null);
    setLoading(false);
    setMinMult(0);
    setSort("outlier");
    setFormatFilter("all");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
    }
  }, []);

  const visible = useMemo(() => {
    if (!data) return [];
    const hasShort = data.results.some((r) => r.format === "short");
    const hasLong = data.results.some((r) => r.format === "long");
    const mixed = hasShort && hasLong;

    let filtered = data.results.filter((r) => r.outlierScore >= minMult);
    // Only apply the format filter when both formats are present, so a stale
    // selection can't empty a single-format result set.
    if (mixed && formatFilter !== "all") {
      filtered = filtered.filter((r) => r.format === formatFilter);
    }

    const sorted = [...filtered];
    if (sort === "views") sorted.sort((a, b) => b.views - a.views);
    else if (sort === "recent")
      sorted.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    else sorted.sort((a, b) => b.outlierScore - a.outlierScore);
    return sorted;
  }, [data, minMult, sort, formatFilter]);

  return (
    <div className="min-h-full">
      <Header onReset={reset} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:pt-12">
        {/* Hero + search */}
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            {d.heroLead}
            <span
              className={`bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent ${
                // Latin sits smaller than Telugu at the same font-size — nudge it up to match.
                lang === "te" ? "text-[1.2em]" : ""
              }`}
            >
              {d.heroHighlight}
            </span>
            {d.heroTrail}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-zinc-400">{d.heroSubtitle}</p>
          <OutlierScale />
        </section>

        <section className="mx-auto mt-8 max-w-3xl">
          <SearchBar
            query={query}
            loading={loading}
            onQueryChange={setQuery}
            onSubmit={() => runSearch(query)}
            onPickExample={pickExample}
          />
        </section>

        {/* Results / states */}
        <section className="mt-10">
          {loading ? (
            <SkeletonGrid count={8} />
          ) : error ? (
            <ErrorState message={error} />
          ) : data ? (
            <Results
              data={data}
              visible={visible}
              minMult={minMult}
              setMinMult={setMinMult}
              sort={sort}
              setSort={setSort}
              formatFilter={formatFilter}
              setFormatFilter={setFormatFilter}
            />
          ) : (
            <Explainer />
          )}
        </section>
      </main>
    </div>
  );
}

function Header({ onReset }: { onReset: () => void }) {
  const { d } = useLang();
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onReset}
          aria-label="Breakout — reset"
          className="flex items-center gap-3 rounded-xl transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
        >
          <span className="rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 p-1.5 shadow-md shadow-black/30 ring-1 ring-white/10">
            <Image
              src="/logo.png"
              alt="Breakout"
              width={32}
              height={32}
              priority
              className="h-8 w-8 rounded-lg"
            />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-base font-bold tracking-tight text-zinc-50">Breakout</span>
            <span className="block text-xs text-zinc-400">{d.tagline}</span>
          </span>
        </button>
        <LanguageToggle />
      </div>
    </header>
  );
}

function Results({
  data,
  visible,
  minMult,
  setMinMult,
  sort,
  setSort,
  formatFilter,
  setFormatFilter,
}: {
  data: OutlierResponse;
  visible: OutlierResponse["results"];
  minMult: number;
  setMinMult: (n: number) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  formatFilter: FormatFilter;
  setFormatFilter: (f: FormatFilter) => void;
}) {
  const { d, lang } = useLang();
  const hasShort = data.results.some((r) => r.format === "short");
  const hasLong = data.results.some((r) => r.format === "long");
  const mixed = hasShort && hasLong;

  const formatOptions: { label: string; value: FormatFilter }[] = [
    { label: d.fmtAll, value: "all" },
    { label: d.fmtLong, value: "long" },
    { label: d.fmtShort, value: "short" },
  ];

  return (
    <div className="space-y-5">
      {data.demo && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-inset ring-amber-500/30">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {d.demoBannerPre}{" "}
            <code className="rounded bg-amber-500/20 px-1 py-0.5 text-[13px]">YOUTUBE_API_KEY</code>{" "}
            {d.demoBannerPost}
          </p>
        </div>
      )}

      <StatsSummary data={data} />

      {/* Filter + sort controls */}
      <div className="flex flex-col gap-3 border-y border-zinc-800/80 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
          <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 ring-1 ring-inset ring-zinc-800">
            {MIN_VALUES.map((v) => (
              <button
                key={v}
                onClick={() => setMinMult(v)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition ${
                  minMult === v ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {v === 0 ? d.filterAll : `${v}x+`}
              </button>
            ))}
          </div>

          {mixed && (
            <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 ring-1 ring-inset ring-zinc-800">
              {formatOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setFormatFilter(o.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    formatFilter === o.value
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {videosCount(lang, visible.length, data.results.length)}
          </span>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{d.sortLabel}</span>
            <Dropdown
              value={sort}
              onChange={setSort}
              ariaLabel={d.sortLabel}
              options={[
                { value: "outlier", label: d.sortOutlier },
                { value: "views", label: d.sortViews },
                { value: "recent", label: d.sortRecent },
              ]}
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500">{d.noMatch}</p>
      ) : (
        <ResultsGrid results={visible} />
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const { d } = useLang();
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-zinc-900/60 p-8 text-center ring-1 ring-inset ring-zinc-800">
      <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
      <h3 className="mt-3 font-semibold text-zinc-100">{d.errorTitle}</h3>
      <p className="mt-1 text-sm text-zinc-400">{message}</p>
    </div>
  );
}

const OUTLIER_LEGEND = [
  { tier: "above" as const, range: "2–3x" },
  { tier: "outlier" as const, range: "3–5x" },
  { tier: "strong" as const, range: "5–10x" },
  { tier: "mega" as const, range: "10x+" },
];

function OutlierScale() {
  const { d, lang } = useLang();
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
      <span className="mr-1 text-xs text-zinc-500">{d.outlierScale}</span>
      {OUTLIER_LEGEND.map((l) => (
        <span
          key={l.tier}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tierStyles[l.tier].badge}`}
        >
          {tierLabels[lang][l.tier]} · {l.range}
        </span>
      ))}
    </div>
  );
}

function Explainer() {
  const { d } = useLang();
  const steps = [
    { n: "1", title: d.step1Title, body: d.step1Body },
    { n: "2", title: d.step2Title, body: d.step2Body },
    { n: "3", title: d.step3Title, body: d.step3Body },
  ];

  return (
    <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
      {steps.map((s) => (
        <div key={s.n} className="rounded-xl bg-zinc-900/50 p-4 ring-1 ring-inset ring-zinc-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-rose-400">
            {s.n}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-100">{s.title}</h3>
          <p className="mt-1 text-xs text-zinc-400">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
