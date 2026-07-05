"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations, type Dict, type Lang } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  d: Dict;
}

const LangContext = createContext<LangContextValue | null>(null);

const STORAGE_KEY = "breakout.lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to Telugu. SSR and the first client render both use this default so
  // there's no hydration mismatch; the saved preference is applied on mount.
  const [lang, setLangState] = useState<Lang>("te");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "te") {
      // One-time restore of a saved preference; intentional mount-time sync.
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setLangState(saved);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
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
