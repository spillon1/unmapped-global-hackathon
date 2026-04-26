import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

import en from "../locales/en.json";
import fr from "../locales/fr.json";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Translations {
  [key: string]: string;
}

export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  flag?: string;
}

export interface I18nContextValue {
  locale: string;
  t: (key: string, fallback?: string) => string;
  setLocale: (locale: string) => void;
  availableLocales: LocaleInfo[];
  isLoading: boolean;
}

// ─── Available locales ────────────────────────────────────────────────────────

export const AVAILABLE_LOCALES: LocaleInfo[] = [
  { code: "en", name: "English",     nativeName: "English",    direction: "ltr", flag: "🇬🇧" },
  { code: "fr", name: "French",      nativeName: "Français",   direction: "ltr", flag: "🇫🇷" },
];

const LOCALE_MAP: Record<string, Translations> = { en, fr };

const STORAGE_KEY = "unmapped_locale";
const DEFAULT_LOCALE = "en";

// ─── Context ──────────────────────────────────────────────────────────────────

const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && AVAILABLE_LOCALES.some(l => l.code === stored)) return stored;
      const browserLang = navigator.language?.split("-")[0] ?? DEFAULT_LOCALE;
      if (AVAILABLE_LOCALES.some(l => l.code === browserLang)) return browserLang;
    }
    return DEFAULT_LOCALE;
  });

  const translations = LOCALE_MAP[locale] ?? LOCALE_MAP[DEFAULT_LOCALE];
  const englishFallback = LOCALE_MAP[DEFAULT_LOCALE];

  const setLocale = useCallback((newLocale: string) => {
    if (!AVAILABLE_LOCALES.some(l => l.code === newLocale)) {
      console.warn(`[i18n] Unknown locale "${newLocale}" — ignoring.`);
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
    // Update html[dir] and html[lang] for a11y
    if (typeof document !== "undefined") {
      const info = AVAILABLE_LOCALES.find(l => l.code === newLocale);
      document.documentElement.lang = newLocale;
      document.documentElement.dir = info?.direction ?? "ltr";
    }
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (translations[key] !== undefined) return translations[key];
      if (englishFallback[key] !== undefined) return englishFallback[key];
      if (fallback !== undefined) return fallback;
      return key;
    },
    [translations, englishFallback],
  );

  return (
    <I18nContext.Provider
      value={{ locale, t, setLocale, availableLocales: AVAILABLE_LOCALES, isLoading: false }}
    >
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n() must be called inside <I18nProvider>.");
  }
  return ctx;
}
