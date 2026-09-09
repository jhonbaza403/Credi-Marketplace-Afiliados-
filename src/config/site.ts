import { getAppUrl } from "@/lib/app-url";

export const SITE_CONFIG = {
  name: "Credi Marketplace",

  description:
    "Marketplace empresarial para comercio, servicios, afiliados, B2B y pagos.",

  url: getAppUrl(),

  locale: "es",

  supportedLocales: ["es", "en", "pt", "fr"] as const,

  defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "USD",

  defaultCountry: process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "VE",

  keywords: [
    "Credi Marketplace",
    "marketplace",
    "comercio",
    "servicios",
    "B2B",
    "afiliados",
    "pagos",
  ],
} as const;

export type SupportedLocale =
  (typeof SITE_CONFIG.supportedLocales)[number];
