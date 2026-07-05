/* eslint-disable @next/next/no-img-element */
import { formatCompact, formatMultiplier } from "@/lib/format";
import { OUTLIER_THRESHOLD } from "@/lib/tiers";
import { outliersLabel, videosAnalyzed } from "@/lib/i18n";
import type { OutlierResponse } from "@/lib/types";
import { useLang } from "./LanguageProvider";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-zinc-900/60 px-3.5 py-2.5 ring-1 ring-inset ring-zinc-800">
      <div className="text-lg font-bold tabular-nums text-zinc-100">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500" title={hint}>
        {label}
      </div>
    </div>
  );
}

export function StatsSummary({ data }: { data: OutlierResponse }) {
  const { d, lang } = useLang();
  const outliers = data.results.filter((r) => r.outlierScore >= OUTLIER_THRESHOLD).length;
  const top = data.results.reduce((max, r) => Math.max(max, r.outlierScore), 0);
  const channel = data.channel;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        {channel?.thumbnail ? (
          <img
            src={channel.thumbnail}
            alt=""
            className="h-12 w-12 rounded-full object-cover ring-1 ring-zinc-700"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-lg font-bold text-zinc-400 ring-1 ring-zinc-700">
            #
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-zinc-100">
            {channel ? channel.title : data.query}
          </h2>
          <p className="truncate text-sm text-zinc-400">
            {channel ? (
              <>
                {channel.subscribers !== undefined && (
                  <>
                    {formatCompact(channel.subscribers, lang)} {d.subscribers} ·{" "}
                  </>
                )}
                {videosAnalyzed(lang, data.results.length, true)}
              </>
            ) : (
              <>
                {d.topicLabel} · {videosAnalyzed(lang, data.results.length, false)}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {channel && (
          <Stat
            label={d.baselineViews}
            value={formatCompact(channel.baseline, lang)}
            hint={channel.baselineMethod}
          />
        )}
        <Stat label={outliersLabel(lang, OUTLIER_THRESHOLD)} value={String(outliers)} />
        <Stat label={d.topMultiplier} value={formatMultiplier(top)} />
      </div>
    </div>
  );
}
