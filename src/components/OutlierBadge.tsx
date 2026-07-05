import { formatMultiplier } from "@/lib/format";
import { tierStyles } from "@/lib/tiers";
import { tierLabels } from "@/lib/i18n";
import type { OutlierTier } from "@/lib/types";
import { useLang } from "./LanguageProvider";

export function OutlierBadge({
  score,
  tier,
  size = "md",
}: {
  score: number;
  tier: OutlierTier;
  size?: "sm" | "md" | "lg";
}) {
  const { lang } = useLang();
  const s = tierStyles[tier];
  const sizing =
    size === "lg"
      ? "text-sm px-2.5 py-1"
      : size === "sm"
        ? "text-[11px] px-1.5 py-0.5"
        : "text-xs px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold tabular-nums ${sizing} ${s.overlay}`}
      title={`${tierLabels[lang][tier]} · ${formatMultiplier(score)}`}
    >
      {tier === "mega" && <span aria-hidden>🔥</span>}
      {formatMultiplier(score)}
    </span>
  );
}
