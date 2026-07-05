"use client";

import { useRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useLang } from "./LanguageProvider";

export function SearchBar({
  query,
  loading,
  onQueryChange,
  onSubmit,
  onPickExample,
}: {
  query: string;
  loading: boolean;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
  onPickExample: (q: string) => void;
}) {
  const { d } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={d.channelHint}
            autoFocus
            spellCheck={false}
            className="w-full rounded-xl bg-zinc-900 py-3.5 pl-11 pr-11 text-[15px] text-zinc-100 placeholder:text-zinc-500 ring-1 ring-inset ring-zinc-800 outline-none transition focus:ring-2 focus:ring-rose-500/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                onQueryChange("");
                inputRef.current?.focus();
              }}
              aria-label="Clear"
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {d.analyzing}
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              {d.findOutliers}
            </>
          )}
        </button>
      </form>

      {/* Example chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">{d.tryLabel}</span>
        {d.channelExamples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onPickExample(ex)}
            className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-300 ring-1 ring-inset ring-zinc-800 transition hover:bg-zinc-800 hover:text-zinc-100"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
