"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Lightbulb,
  ListOrdered,
  Loader2,
  Sparkles,
  TrendingUp,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatCompact, timeAgo } from "@/lib/format";
import type { VideoAnalysis } from "@/lib/analysis";
import type { VideoOutlier } from "@/lib/types";
import { useLang } from "./LanguageProvider";
import { OutlierBadge } from "./OutlierBadge";

function CopyButton({ text }: { text: string }) {
  const { d } = useLang();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard unavailable — no-op
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${
        copied
          ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
          : "bg-zinc-800 text-zinc-300 ring-zinc-700 hover:bg-zinc-700 hover:text-zinc-100"
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? d.copiedWord : d.copyWord}
    </button>
  );
}

function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** One labeled paragraph in the breakdown. Renders nothing when empty. */
function AItem({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: string }) {
  if (!children) return null;
  return (
    <div className="rounded-lg bg-zinc-800/50 p-3 ring-1 ring-inset ring-zinc-800">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
        <Icon className="h-3.5 w-3.5 text-rose-400" />
        {label}
      </div>
      <p className="text-sm leading-relaxed text-zinc-300">{children}</p>
    </div>
  );
}

/** A labeled bullet list in the breakdown. */
function AList({ icon: Icon, label, items }: { icon: LucideIcon; label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg bg-zinc-800/50 p-3 ring-1 ring-inset ring-zinc-800">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
        <Icon className="h-3.5 w-3.5 text-rose-400" />
        {label}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-zinc-300">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-rose-400/70" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisSkeleton({ text }: { text: string }) {
  const widths = ["w-full", "w-11/12", "w-4/6"];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {text}
      </div>
      <div className="space-y-2">
        {widths.map((w) => (
          <div key={w} className={`h-3 animate-pulse rounded bg-zinc-800 ${w}`} />
        ))}
      </div>
    </div>
  );
}

type Status = "loading" | "done" | "error";

export function VideoModal({ video, onClose }: { video: VideoOutlier; onClose: () => void }) {
  const { d, lang } = useLang();
  const watchUrl = `https://www.youtube.com/watch?v=${video.id}`;
  const embedUrl = `https://www.youtube.com/embed/${video.id}`;

  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // Reset to loading the moment the video or language changes — done during
  // render (React's "adjust state on prop change" pattern) so the fetch effect
  // never calls setState synchronously in its body.
  const reqKey = `${video.id}:${lang}`;
  const [syncedKey, setSyncedKey] = useState(reqKey);
  if (reqKey !== syncedKey) {
    setSyncedKey(reqKey);
    setAnalysis(null);
    setStatus("loading");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Fetch the AI breakdown on open (and when the language changes).
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ video, lang }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((data: { analysis?: VideoAnalysis }) => {
        if (data.analysis) {
          setAnalysis(data.analysis);
          setStatus("done");
        } else {
          setStatus("error");
        }
      })
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) setStatus("error");
      });
    return () => ctrl.abort();
  }, [video, lang]);

  // The whole breakdown as plain text, for the section's Copy button.
  const breakdownText = analysis
    ? [
        analysis.hook ? `${d.aHook}: ${analysis.hook}` : "",
        analysis.whyItWorked ? `${d.aWhy}: ${analysis.whyItWorked}` : "",
        analysis.titleCritique ? `${d.aTitleTips}: ${analysis.titleCritique}` : "",
        analysis.thumbnailCritique ? `${d.aThumbTips}: ${analysis.thumbnailCritique}` : "",
        analysis.outline.length
          ? `${d.aOutline}:\n${analysis.outline.map((x) => `• ${x}`).join("\n")}`
          : "",
        analysis.takeaways.length
          ? `${d.aTakeaways}:\n${analysis.takeaways.map((x) => `• ${x}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="animate-pop relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-zinc-800"
      >
        {/* Header (fixed) */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 p-4">
          <div className="flex min-w-0 items-center gap-2">
            <OutlierBadge score={video.outlierScore} tier={video.tier} size="sm" />
            <span className="truncate text-xs text-zinc-400">
              {formatCompact(video.views, lang)} {d.viewsWord} · {timeAgo(video.publishedAt, lang)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 space-y-5 overflow-y-auto p-4">
          {/* Title */}
          <Section label={d.secTitle} action={<CopyButton text={video.title} />}>
            <p className="rounded-lg bg-zinc-800/60 p-3 text-sm font-medium leading-snug text-zinc-100 ring-1 ring-inset ring-zinc-800">
              {video.title}
            </p>
          </Section>

          {/* AI breakdown — the swipe-file analysis */}
          <Section
            label={d.breakdownHeading}
            action={status === "done" && analysis ? <CopyButton text={breakdownText} /> : undefined}
          >
            {status === "loading" ? (
              <AnalysisSkeleton text={d.analyzingVideo} />
            ) : status === "error" || !analysis ? (
              <p className="rounded-lg bg-zinc-800/40 p-3 text-sm text-zinc-400 ring-1 ring-inset ring-zinc-800">
                {d.analysisUnavailable}
              </p>
            ) : (
              <div className="space-y-3">
                <AItem icon={Sparkles} label={d.aHook}>
                  {analysis.hook}
                </AItem>
                <AItem icon={TrendingUp} label={d.aWhy}>
                  {analysis.whyItWorked}
                </AItem>
                <AItem icon={Type} label={d.aTitleTips}>
                  {analysis.titleCritique}
                </AItem>
                <AItem icon={ImageIcon} label={d.aThumbTips}>
                  {analysis.thumbnailCritique}
                </AItem>
                <AList icon={ListOrdered} label={d.aOutline} items={analysis.outline} />
                <AList icon={Lightbulb} label={d.aTakeaways} items={analysis.takeaways} />
                <p className="pt-0.5 text-[10px] text-zinc-600">{d.aiDisclaimer}</p>
              </div>
            )}
          </Section>

          {/* Embedded video */}
          <Section
            label={d.secVideo}
            action={
              <a
                href={watchUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700 transition hover:bg-zinc-700 hover:text-zinc-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {d.openWord}
              </a>
            }
          >
            <div className="aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-inset ring-zinc-800">
              <iframe
                src={embedUrl}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
