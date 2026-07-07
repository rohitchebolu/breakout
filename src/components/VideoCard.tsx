/* eslint-disable @next/next/no-img-element */
import type { MouseEvent } from "react";
import { formatCompact, formatDuration, formatMultiplier, timeAgo } from "@/lib/format";
import { shareText } from "@/lib/i18n";
import { tierStyles } from "@/lib/tiers";
import type { VideoOutlier } from "@/lib/types";
import { OutlierBadge } from "./OutlierBadge";
import { useLang } from "./LanguageProvider";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function VideoCard({
  video,
  showChannel,
  onOpen,
}: {
  video: VideoOutlier;
  showChannel?: boolean;
  onOpen: () => void;
}) {
  const { d, lang } = useLang();
  const s = tierStyles[video.tier];
  const duration = formatDuration(video.durationSeconds);
  const watchUrl = `https://www.youtube.com/watch?v=${video.id}`;

  const share = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const text = shareText(lang, formatMultiplier(video.outlierScore), watchUrl);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl bg-zinc-900/60 ring-1 ring-inset ring-zinc-800 transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 ${s.ring}`}
    >
      <div className="relative aspect-video overflow-hidden bg-zinc-800">
        <img
          src={video.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute left-2 top-2">
          <OutlierBadge score={video.outlierScore} tier={video.tier} size="md" />
        </div>
        {duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {duration}
          </span>
        )}
        {video.format === "short" && (
          <span className="absolute bottom-2 left-2 rounded bg-fuchsia-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {d.shortBadge}
          </span>
        )}
        {/* WhatsApp share — sits above the stretched link (z-20 > z-10) */}
        <button
          type="button"
          onClick={share}
          aria-label={d.shareLabel}
          title={d.shareLabel}
          className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-[#25D366] ring-1 ring-white/15 backdrop-blur transition hover:scale-105 hover:bg-black/90"
        >
          <WhatsAppIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-100">
          {video.title}
        </h3>
        {showChannel && (
          <div className="flex min-w-0 items-center gap-1.5">
            {video.channelThumbnail && (
              <img
                src={video.channelThumbnail}
                alt=""
                loading="lazy"
                className="h-4 w-4 shrink-0 rounded-full"
              />
            )}
            <p className="truncate text-xs text-zinc-400">{video.channelTitle}</p>
          </div>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-zinc-500">
          <span className="font-medium text-zinc-300">
            {formatCompact(video.views, lang)} {d.viewsWord}
          </span>
          <span aria-hidden>·</span>
          <span>{timeAgo(video.publishedAt, lang)}</span>
        </div>
        <p className="text-[11px] text-zinc-500">
          {formatCompact(Math.round(video.baseline), lang)} {d.baselineWord}
          <span aria-hidden> · </span>
          <span className={video.tier === "normal" ? "text-zinc-400" : "text-zinc-300"}>
            {formatMultiplier(video.outlierScore)} {d.vsUsual}
          </span>
        </p>
      </div>
    </div>
  );
}
