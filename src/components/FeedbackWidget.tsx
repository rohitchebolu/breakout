"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Frown, Loader2, type LucideIcon, MessageCircle, Meh, Smile, X } from "lucide-react";
import { useLang } from "./LanguageProvider";
import type { Sentiment } from "@/lib/feedback";

type Status = "idle" | "sending" | "done" | "error";

// The three sentiments, with the app's tier palette reused for the selected
// state (emerald = good, amber = neutral, rose = problem).
const FACES: {
  value: Sentiment;
  icon: LucideIcon;
  labelKey: "fbLove" | "fbMeh" | "fbIssue";
  active: string;
}[] = [
  {
    value: "love",
    icon: Smile,
    labelKey: "fbLove",
    active: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
  },
  {
    value: "meh",
    icon: Meh,
    labelKey: "fbMeh",
    active: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
  },
  {
    value: "issue",
    icon: Frown,
    labelKey: "fbIssue",
    active: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
  },
];

/**
 * A low-friction feedback widget: a floating button that opens a small popover
 * with a one-tap sentiment and an optional note. Non-modal (the page stays
 * usable), bilingual, keyboard-friendly (Esc to close, ⌘/Ctrl+Enter to send),
 * and dismissible by clicking away.
 */
export function FeedbackWidget() {
  const { d, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [honeypot, setHoneypot] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const closeTimer = useRef<number | undefined>(undefined);

  const canSubmit = sentiment !== null || message.trim() !== "";

  const openPanel = useCallback(() => {
    setStatus("idle"); // clear any stale error from a previous attempt
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  // Esc + click-away dismiss, only while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  // Move focus into the panel on open; return it to the button on close.
  useEffect(() => {
    if (open) cardRef.current?.focus();
    else if (wasOpen.current) fabRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Clear any pending auto-close timer on unmount.
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  async function submit() {
    if (!canSubmit || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sentiment,
          message: message.trim(),
          lang,
          path: typeof window !== "undefined" ? window.location.pathname : "",
          website: honeypot,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
      setSentiment(null);
      setMessage("");
      // Let the "thanks" land, then tuck the panel away.
      closeTimer.current = window.setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 1800);
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {/* Floating trigger — kept mounted (inert while open) so focus can return. */}
      <button
        ref={fabRef}
        type="button"
        onClick={openPanel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={d.fbTitle}
        tabIndex={open ? -1 : 0}
        className={`group fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-zinc-900/90 px-4 py-2.5 text-sm font-medium text-zinc-300 shadow-lg shadow-black/40 ring-1 ring-inset ring-zinc-700/80 backdrop-blur transition hover:text-zinc-100 hover:ring-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <MessageCircle className="h-4 w-4 text-rose-400 transition group-hover:scale-110" />
        <span className="hidden sm:inline">{d.fbButton}</span>
      </button>

      {open && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="false"
          aria-label={d.fbTitle}
          tabIndex={-1}
          style={{ transformOrigin: "bottom right" }}
          className="animate-pop fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-2xl bg-zinc-900 p-4 shadow-2xl shadow-black/50 outline-none ring-1 ring-zinc-800"
        >
          {status === "done" ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30">
                <Check className="h-5 w-5 text-emerald-300" />
              </div>
              <p className="text-sm font-medium text-zinc-100">{d.fbThanks}</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">{d.fbTitle}</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{d.fbSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label={d.fbClose}
                  className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Sentiment */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {FACES.map((f) => {
                  const selected = sentiment === f.value;
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setSentiment(selected ? null : f.value)}
                      aria-pressed={selected}
                      className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 ${
                        selected
                          ? f.active
                          : "bg-zinc-800/50 text-zinc-400 ring-zinc-700/70 hover:bg-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {d[f.labelKey]}
                    </button>
                  );
                })}
              </div>

              {/* Optional note */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
                }}
                rows={3}
                maxLength={1000}
                placeholder={d.fbPlaceholder}
                className="mt-3 w-full resize-none rounded-xl bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-inset ring-zinc-800 transition placeholder:text-zinc-600 focus:ring-rose-500/50"
              />

              {/* Honeypot — off-screen, hidden from real users, catches bots. */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
              />

              {status === "error" && <p className="mt-2 text-xs text-rose-400">{d.fbError}</p>}

              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit || status === "sending"}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {status === "sending" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {d.fbSending}
                  </>
                ) : (
                  d.fbSend
                )}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
