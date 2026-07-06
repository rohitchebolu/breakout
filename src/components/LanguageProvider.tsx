"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { translations, type Dict, type Lang } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  d: Dict;
}

const LangContext = createContext<LangContextValue | null>(null);

const COOKIE_KEY = "breakout.lang";

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: ReactNode;
}) {
  // Seeded from a cookie the server already read, so SSR and the first client
  // render agree on the language — no flash/flicker on refresh.
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    // Persist for future server renders (1 year).
    document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, d: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LanguageProvider");
  return ctx;
}
