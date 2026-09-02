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

const translations = {
  es: {
    bannerTag: "Credi Marketplace",
    bannerTitle: "Oportunidades seleccionadas para crecer",
    bannerDesc: "Accede a una selección cuidadosamente curada de productos, servicios y plataformas internacionales que complementan el ecosistema de Credi Marketplace.",
    subtitle: "Ecosistema global de comercio y servicios",
    support: "Soporte",
    rights: "Todos los derechos reservados.",
    terms: "Términos y condiciones",
    privacy: "Privacidad",
  },
  en: {
    bannerTag: "Credi Marketplace",
    bannerTitle: "Selected opportunities to grow",
    bannerDesc: "Access a carefully curated selection of products, services and international platforms that complement the Credi Marketplace ecosystem.",
    subtitle: "Global commerce and services ecosystem",
    support: "Support",
    rights: "All rights reserved.",
    terms: "Terms and conditions",
    privacy: "Privacy",
  },
  pt: {
    bannerTag: "Credi Marketplace",
    bannerTitle: "Oportunidades selecionadas para crescer",
    bannerDesc: "Acesse uma seleção cuidadosamente curada de produtos, serviços e plataformas internacionais que complementam o ecossistema Credi Marketplace.",
    subtitle: "Ecossistema global de comércio e serviços",
    support: "Suporte",
    rights: "Todos os direitos reservados.",
    terms: "Termos e condições",
    privacy: "Privacidade",
  },
  fr: {
    bannerTag: "Credi Marketplace",
    bannerTitle: "Opportunités sélectionnées pour grandir",
    bannerDesc: "Accédez à une sélection soigneusement organisée de produits, services et plateformes internationales qui complètent l’écosystème Credi Marketplace.",
    subtitle: "Écosystème mondial de commerce et de services",
    support: "Support",
    rights: "Tous droits réservés.",
    terms: "Conditions générales",
    privacy: "Confidentialité",
  },
} as const;

type TranslationKey = keyof typeof translations.es;

export interface LanguageContextValue {
  locale: Locale;
  lang: Locale;
  localeConfig: LocaleConfig;
  availableLocales: readonly Locale[];
  setLocale(locale: Locale): void;
  changeLanguage(locale: Locale): void;
  t(key: TranslationKey): string;
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
  const t = useCallback(
    (key: TranslationKey) => translations[locale][key] ?? translations.es[key],
    [locale],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      lang: locale,
      localeConfig,
      availableLocales: locales,
      setLocale,
      changeLanguage,
      t,
    }),
    [locale, localeConfig, setLocale, changeLanguage, t],
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
