"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Flame, Loader2, TrendingUp, X } from "lucide-react";
import { categories } from "@/lib/creators";
import type { CategoryTrend } from "@/lib/analysis";
import type { VideoOutlier } from "@/lib/types";
import { VideoCard } from "./VideoCard";
import { VideoModal } from "./VideoModal";
import { useLang } from "./LanguageProvider";

interface CatState {
  loading: boolean;
  results: VideoOutlier[];
  error?: string;
  note?: string;
  trend?: { en: CategoryTrend; te: CategoryTrend };
}

// "Top breakouts" browser — the biggest outlier videos per category. (Export
// name kept as TopCreators so the header import is unchanged.)
export function TopCreators() {
  const { d, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(categories[0].key);
  const [byCat, setByCat] = useState<Record<string, CatState>>({});
  const [selected, setSelected] = useState<VideoOutlier | null>(null);
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null);
      else setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, selected]);

  const load = (key: string) => {
    if (loadedRef.current.has(key)) return;
    loadedRef.current.add(key);
    setByCat((s) => ({ ...s, [key]: { loading: true, results: [] } }));
    fetch(`/api/top-outliers?category=${key}`)
      .then((r) => r.json())
      .then((data) =>
        setByCat((s) => ({
          ...s,
          [key]: {
            loading: false,
            results: data.results ?? [],
            error: data.error,
            note: data.note,
            trend: data.trend,
          },
        })),
      )
      .catch(() =>
        setByCat((s) => ({ ...s, [key]: { loading: false, results: [], error: "Failed to load." } })),
      );
  };

  const openModal = () => {
    setOpen(true);
    load(activeKey);
  };

  const selectTab = (key: string) => {
    setActiveKey(key);
    load(key);
  };

  const active = byCat[activeKey];
  const trend = active?.trend?.[lang];

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="cta-glow cta-shimmer relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-rose-500/30 transition hover:brightness-110"
      >
        <Flame className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Top breakouts</span>
        <span className="sm:hidden">Top</span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 cursor-default bg-black/70 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="animate-pop relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-zinc-800"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/25">
                  <Flame className="h-4 w-4 text-white" />
                </span>
                <div className="leading-tight">
                  <h2 className="text-sm font-bold text-zinc-100">Top breakouts</h2>
                  <p className="text-[11px] text-zinc-500">
                    Biggest outlier videos from top Telugu creators
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-800 px-3 py-2">
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => selectTab(c.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    c.key === activeKey
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!active || active.loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Finding the biggest breakouts…</span>
                </div>
              ) : active.error ? (
                <p className="py-20 text-center text-sm text-zinc-500">{active.error}</p>
              ) : active.results.length === 0 ? (
                <p className="py-20 text-center text-sm text-zinc-500">
                  {active.note ?? "No breakouts found here yet — try another category."}
                </p>
              ) : (
                <>
                  {trend?.topic && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-gradient-to-r from-rose-500/10 to-orange-500/10 p-3 ring-1 ring-inset ring-rose-500/20">
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-rose-300">
                          {d.trendingNow} · {trend.topic}
                        </p>
                        <p className="text-xs leading-relaxed text-zinc-400">{trend.summary}</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {active.results.map((v) => (
                      <VideoCard key={v.id} video={v} showChannel onOpen={() => setSelected(v)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {selected && <VideoModal video={selected} onClose={() => setSelected(null)} />}
          </div>,
          document.body,
        )}
    </>
  );
}
