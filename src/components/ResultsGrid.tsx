"use client";

import { useState } from "react";
import type { VideoOutlier } from "@/lib/types";
import { VideoCard } from "./VideoCard";
import { VideoModal } from "./VideoModal";

export function ResultsGrid({
  results,
  showChannel,
}: {
  results: VideoOutlier[];
  showChannel?: boolean;
}) {
  const [selected, setSelected] = useState<VideoOutlier | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {results.map((v) => (
          <VideoCard
            key={v.id + v.publishedAt}
            video={v}
            showChannel={showChannel}
            onOpen={() => setSelected(v)}
          />
        ))}
      </div>
      {selected && <VideoModal video={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl bg-zinc-900/60 ring-1 ring-inset ring-zinc-800"
        >
          <div className="aspect-video animate-pulse bg-zinc-800" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-11/12 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
