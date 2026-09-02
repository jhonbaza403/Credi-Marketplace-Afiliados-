```tsx id="r1tq8m"
// ==========================================================
// ARCHIVO: src/context/LanguageContext.tsx
// Credi Marketplace
//
// Global Language Context
//
// Next.js 16
// React 19
// TypeScript
// i18n Ready
// ==========================================================

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

// ==========================================================
// TIPOS
// ==========================================================

export interface LanguageContextValue {
  locale: Locale;
  localeConfig: LocaleConfig;
  availableLocales: readonly Locale[];

  setLocale(locale: Locale): void;
  changeLanguage(locale: Locale): void;
}

// ==========================================================
// CONSTANTES
// ==========================================================

const LANGUAGE_STORAGE_KEY = "credi-marketplace-locale";

// ==========================================================
// CONTEXTO
// ==========================================================

const LanguageContext = createContext<
  LanguageContextValue | undefined
>(undefined);

// ==========================================================
// PROVIDER
// ==========================================================

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [locale, setLocaleState] =
    useState<Locale>(defaultLocale);

  // ========================================================
  // CARGAR IDIOMA PERSISTIDO
  // ========================================================

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        LANGUAGE_STORAGE_KEY,
      );

      if (stored && isLocale(stored)) {
        setLocaleState(stored);
        document.documentElement.lang = stored;
        return;
      }

      document.documentElement.lang = defaultLocale;
    } catch {
      setLocaleState(defaultLocale);
      document.documentElement.lang = defaultLocale;
    }
  }, []);

  // ========================================================
  // CAMBIAR IDIOMA
  // ========================================================

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);

      try {
        localStorage.setItem(
          LANGUAGE_STORAGE_KEY,
          newLocale,
        );

        document.documentElement.lang = newLocale;
      } catch {
        // La persistencia local es opcional.
        // El estado de React continúa funcionando.
      }
    },
    [],
  );

  // ========================================================
  // API DE CAMBIO DE IDIOMA
  // ========================================================

  const changeLanguage = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
    },
    [setLocale],
  );

  // ========================================================
  // CONFIGURACIÓN DEL IDIOMA ACTUAL
  // ========================================================

  const localeConfig = useMemo(
    () => getLocaleConfig(locale),
    [locale],
  );

  // ========================================================
  // VALOR DEL CONTEXTO
  // ========================================================

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      localeConfig,
      availableLocales: locales,
      setLocale,
      changeLanguage,
    }),
    [
      locale,
      localeConfig,
      setLocale,
      changeLanguage,
    ],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ==========================================================
// HOOK
// ==========================================================

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage debe utilizarse dentro de LanguageProvider",
    );
  }

  return context;
}
```
