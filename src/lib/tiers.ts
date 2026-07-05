import type { OutlierTier } from "./types";

// Visual + label metadata for each outlier tier. Client-safe (no server deps).
// `badge`   — translucent tint, for use on the dark page bg (hero legend).
// `overlay` — solid dark base, for the badge sitting ON a thumbnail image,
//             so it stays legible over bright/busy artwork.
export const tierStyles: Record<
  OutlierTier,
  { label: string; badge: string; overlay: string; ring: string }
> = {
  normal: {
    label: "Normal",
    badge: "bg-zinc-800 text-zinc-300 ring-1 ring-inset ring-zinc-700",
    overlay: "bg-black/75 text-zinc-100 ring-1 ring-inset ring-white/25 backdrop-blur-sm",
    ring: "",
  },
  above: {
    label: "Above avg",
    badge: "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30",
    overlay: "bg-black/75 text-sky-300 ring-1 ring-inset ring-sky-400/50 backdrop-blur-sm",
    ring: "hover:ring-sky-500/40",
  },
  outlier: {
    label: "Outlier",
    badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
    overlay: "bg-black/75 text-emerald-300 ring-1 ring-inset ring-emerald-400/50 backdrop-blur-sm",
    ring: "hover:ring-emerald-500/40",
  },
  strong: {
    label: "Strong",
    badge: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
    overlay: "bg-black/75 text-amber-300 ring-1 ring-inset ring-amber-400/50 backdrop-blur-sm",
    ring: "hover:ring-amber-500/40",
  },
  mega: {
    label: "Breakout",
    badge:
      "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25",
    overlay:
      "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-black/50",
    ring: "hover:ring-rose-500/50",
  },
};

export const OUTLIER_THRESHOLD = 3;
