/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Check, Copy, Download, ExternalLink, X } from "lucide-react";
import { formatCompact, timeAgo } from "@/lib/format";
import type { VideoOutlier } from "@/lib/types";
import { useLang } from "./LanguageProvider";
import { OutlierBadge } from "./OutlierBadge";

function CopyButton({ text }: { text: string }) {
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
      {copied ? "Copied" : "Copy"}
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

export function VideoModal({ video, onClose }: { video: VideoOutlier; onClose: () => void }) {
  const { lang } = useLang();
  const description = video.description?.trim() ?? "";
  const watchUrl = `https://www.youtube.com/watch?v=${video.id}`;
  const embedUrl = `https://www.youtube.com/embed/${video.id}`;

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
              {formatCompact(video.views, lang)} views · {timeAgo(video.publishedAt, lang)}
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
          <Section label="Title" action={<CopyButton text={video.title} />}>
            <p className="rounded-lg bg-zinc-800/60 p-3 text-sm font-medium leading-snug text-zinc-100 ring-1 ring-inset ring-zinc-800">
              {video.title}
            </p>
          </Section>

          {/* Idea (description) — hidden when the video has no description */}
          {description && (
            <Section label="Idea" action={<CopyButton text={description} />}>
              <div className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-800/60 p-3 text-sm leading-relaxed text-zinc-300 ring-1 ring-inset ring-zinc-800">
                {description}
              </div>
            </Section>
          )}

          {/* Embedded video */}
          <Section
            label="Video"
            action={
              <a
                href={watchUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700 transition hover:bg-zinc-700 hover:text-zinc-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
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

          {/* Thumbnail export */}
          <Section
            label="Thumbnail"
            action={
              <a
                href={`/api/thumbnail?id=${video.id}`}
                download={`${video.id}.jpg`}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-rose-500 to-orange-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:brightness-110"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            }
          >
            <img
              src={video.thumbnail}
              alt=""
              className="w-full rounded-lg ring-1 ring-inset ring-zinc-800"
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
