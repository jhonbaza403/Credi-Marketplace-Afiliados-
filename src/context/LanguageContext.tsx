"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  locales,
  defaultLocale,
  isLocale,
  type Locale,
  getLocaleConfig,
  type LocaleConfig,
} from "@/i18n/config";

export interface LanguageContextValue {
  locale: Locale;
  localeConfig: LocaleConfig;
  availableLocales: readonly Locale[];
  setLocale(locale: Locale): void;
  changeLanguage(locale: Locale): void;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "credi-marketplace-locale";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      const nextLocale = stored && isLocale(stored) ? stored : defaultLocale;
      setLocaleState(nextLocale);
      document.documentElement.lang = nextLocale;
    } catch {
      document.documentElement.lang = defaultLocale;
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    } catch {
      document.documentElement.lang = newLocale;
    }
  }, []);

  const changeLanguage = useCallback(
    (newLocale: Locale) => setLocale(newLocale),
    [setLocale],
  );

  const localeConfig = useMemo(() => getLocaleConfig(locale), [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      localeConfig,
      availableLocales: locales,
      setLocale,
      changeLanguage,
    }),
    [locale, localeConfig, setLocale, changeLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage debe utilizarse dentro de LanguageProvider");
  }
  return context;
}
