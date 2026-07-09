"use client";

import { useEffect, useState } from "react";
import type { Analytics } from "@/lib/analytics";
import type { Sentiment } from "@/lib/feedback";
import { timeAgo } from "@/lib/format";

const TKEY = "breakout.stats.token";

const SENTIMENT_TAG: Record<Sentiment, { label: string; cls: string }> = {
  love: { label: "Love", cls: "bg-emerald-500/15 text-emerald-300" },
  meh: { label: "Okay", cls: "bg-amber-500/15 text-amber-300" },
  issue: { label: "Issue", cls: "bg-rose-500/15 text-rose-300" },
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-zinc-900 p-4 ring-1 ring-inset ring-zinc-800">
      <div className="text-2xl font-bold tabular-nums text-zinc-100">
        {value.toLocaleString("en-IN")}
      </div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-28 shrink-0 truncate text-zinc-400">{label}</div>
      <div className="h-4 flex-1 overflow-hidden rounded bg-zinc-800">
        <div
          className="h-full rounded bg-gradient-to-r from-rose-500 to-orange-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-10 shrink-0 text-right tabular-nums text-zinc-300">{value}</div>
    </div>
  );
}

export default function StatsPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<Analytics | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  // Auto-load with a previously-saved token (setState only in async callbacks).
  useEffect(() => {
    const saved = localStorage.getItem(TKEY);
    if (!saved) return;
    const ctrl = new AbortController();
    fetch("/api/stats", { headers: { authorization: `Bearer ${saved}` }, signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Analytics) => setData(d))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  async function submit() {
    setStatus("loading");
    try {
      const r = await fetch("/api/stats", { headers: { authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error();
      const d: Analytics = await r.json();
      localStorage.setItem(TKEY, token);
      setData(d);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function signOut() {
    localStorage.removeItem(TKEY);
    setData(null);
    setToken("");
    setStatus("idle");
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
        <div className="w-full max-w-xs space-y-3">
          <h1 className="text-center text-sm font-semibold text-zinc-300">
            Breakout · Private stats
          </h1>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Admin token"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-inset ring-zinc-800 focus:ring-rose-500/50"
          />
          <button
            type="button"
            onClick={submit}
            disabled={status === "loading" || !token}
            className="w-full rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {status === "loading" ? "Checking…" : "View stats"}
          </button>
          {status === "error" && <p className="text-center text-xs text-rose-400">Wrong token.</p>}
        </div>
      </main>
    );
  }

  const catMax = Math.max(1, ...data.byCategory.map((c) => c.count));
  const langMax = Math.max(1, data.byLang.en, data.byLang.te);
  const dayMax = Math.max(1, ...data.daily.map((d) => d.analyze + d.search));

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Breakout · Private stats</h1>
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            Sign out
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Searches" value={data.totals.search} />
          <StatCard label="Breakdowns" value={data.totals.analyze} />
          <StatCard label="Breakout views" value={data.totals.breakouts} />
        </div>

        <section className="rounded-xl bg-zinc-900 p-4 ring-1 ring-inset ring-zinc-800">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Breakouts by category
          </h2>
          <div className="space-y-2">
            {data.byCategory.map((c) => (
              <Bar key={c.key} label={c.label} value={c.count} max={catMax} />
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-zinc-900 p-4 ring-1 ring-inset ring-zinc-800">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Breakdown language
          </h2>
          <div className="space-y-2">
            <Bar label="English" value={data.byLang.en} max={langMax} />
            <Bar label="Telugu" value={data.byLang.te} max={langMax} />
          </div>
        </section>

        <section className="rounded-xl bg-zinc-900 p-4 ring-1 ring-inset ring-zinc-800">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Last 14 days (searches + breakdowns)
          </h2>
          <div className="flex h-20 items-end gap-1">
            {data.daily.map((d) => {
              const total = d.analyze + d.search;
              const h = Math.round((total / dayMax) * 72) + 2;
              return (
                <div
                  key={d.date}
                  className="flex-1"
                  title={`${d.date}: ${d.search} searches, ${d.analyze} breakdowns, ${d.breakouts} breakout views`}
                >
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-rose-500 to-orange-400"
                    style={{ height: `${h}px` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
            <span>{data.daily[0]?.date.slice(5)}</span>
            <span>{data.daily[data.daily.length - 1]?.date.slice(5)}</span>
          </div>
        </section>

        <section className="rounded-xl bg-zinc-900 p-4 ring-1 ring-inset ring-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Feedback
            </h2>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">
                Love {data.feedback.bySentiment.love}
              </span>
              <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-300">
                Okay {data.feedback.bySentiment.meh}
              </span>
              <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-rose-300">
                Issue {data.feedback.bySentiment.issue}
              </span>
            </div>
          </div>

          {data.feedback.recent.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-600">No feedback yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.feedback.recent.map((f, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-zinc-950/50 p-3 ring-1 ring-inset ring-zinc-800"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      {f.sentiment && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-medium ${SENTIMENT_TAG[f.sentiment].cls}`}
                        >
                          {SENTIMENT_TAG[f.sentiment].label}
                        </span>
                      )}
                      <span className="uppercase">{f.lang}</span>
                      {f.path && f.path !== "/" && <span className="text-zinc-600">{f.path}</span>}
                    </span>
                    <span>{timeAgo(f.at, "en")}</span>
                  </div>
                  {f.message && (
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-zinc-200">
                      {f.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
