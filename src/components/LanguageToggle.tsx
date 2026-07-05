"use client";

import type { Lang } from "@/lib/i18n";
import { useLang } from "./LanguageProvider";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "te", label: "తె" },
];

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 text-xs ring-1 ring-inset ring-zinc-800">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setLang(o.value)}
          aria-pressed={lang === o.value}
          className={`rounded-md px-2 py-1 font-semibold transition ${
            lang === o.value
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
