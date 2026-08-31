// ==========================================================
// ARCHIVO: src/i18n/config.ts
// Credi Marketplace
//
// Internacionalización (i18n)
// Locales, monedas y métodos de pago
//
// Next.js App Router
// TypeScript
// ==========================================================

import type { B2BPaymentMethod } from '@/types/b2b';

// ==========================================================
// LOCALES
// ==========================================================

/**
 * Idiomas oficialmente soportados por Credi Marketplace.
 *
 * El locale representa el idioma/interfaz, NO la moneda.
 */
export const locales = [
  'es',
  'en',
  'pt',
  'fr',
] as const;

export type Locale = (typeof locales)[number];

/**
 * Idioma predeterminado.
 */
export const defaultLocale: Locale = 'es';

// ==========================================================
// CONFIGURACIÓN DE LOCALES
// ==========================================================

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  currency: string;
  currencySymbol: string;
}

export const LOCALE_CONFIG: Readonly<
  Record<Locale, LocaleConfig>
> = {
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    currency: 'USD',
    currencySymbol: '$',
  },

  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    currency: 'USD',
    currencySymbol: '$',
  },

  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    currency: 'BRL',
    currencySymbol: 'R$',
  },

  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    currency: 'EUR',
    currencySymbol: '€',
  },
} as const;

// ==========================================================
// MONEDA PREDETERMINADA POR LOCALE
// ==========================================================

/**
 * Compatibilidad con código existente.
 *
 * IMPORTANTE:
 * Esta asignación solamente representa una moneda
 * predeterminada de interfaz.
 *
 * No determina necesariamente la moneda de una transacción.
 */
export const currencyMap: Readonly<
  Record<Locale, string>
> = {
  es: 'USD',
  en: 'USD',
  pt: 'BRL',
  fr: 'EUR',
} as const;

// ==========================================================
// MONEDAS FIAT
// ==========================================================

export const FIAT_CURRENCIES = [
  'USD',
  'VES',
  'BRL',
  'EUR',
  'COP',
  'MXN',
  'ARS',
] as const;

export type FiatCurrency =
  (typeof FIAT_CURRENCIES)[number];

// ==========================================================
// CRIPTOMONEDAS
// ==========================================================

export const CRYPTO_CURRENCIES = [
  'USDT',
] as const;

export type CryptoCurrency =
  (typeof CRYPTO_CURRENCIES)[number];

// ==========================================================
// MONEDAS SOPORTADAS
// ==========================================================

export const SUPPORTED_CURRENCIES = {
  FIAT: FIAT_CURRENCIES,
  CRYPTO: CRYPTO_CURRENCIES,
} as const;

export type SupportedCurrency =
  | FiatCurrency
  | CryptoCurrency;

// ==========================================================
// MÉTODOS DE PAGO B2B
// ==========================================================

export interface B2BPaymentOption {
  id: B2BPaymentMethod;

  /**
   * Clave de traducción.
   *
   * No almacenamos textos traducibles directamente como
   * nombre definitivo dentro de la configuración.
   */
  nameKey: string;

  /**
   * Icono visual.
   *
   * La UI puede sustituir posteriormente este valor por
   * componentes SVG/React.
   */
  icon: string;

  type: 'crypto' | 'fiat';

  /**
   * Moneda utilizada por el método.
   */
  currency: SupportedCurrency;

  /**
   * Red blockchain cuando corresponda.
   */
  network?: 'TRC20';

  /**
   * Indica si requiere comprobante/referencia.
   */
  requiresReference: boolean;
}

// ==========================================================
// MÉTODOS B2B OFICIALES
// ==========================================================

/**
 * DEBE mantenerse sincronizado con:
 *
 * public.b2b_payment_method
 *
 * PostgreSQL:
 *
 * - binance_pay
 * - usdt_trc20
 * - bank_transfer
 */
export const B2B_PAYMENT_METHODS: readonly B2BPaymentOption[] = [
  {
    id: 'binance_pay',
    nameKey: 'payments.binancePay',
    icon: '⚡',
    type: 'crypto',
    currency: 'USDT',
    requiresReference: true,
  },

  {
    id: 'usdt_trc20',
    nameKey: 'payments.usdtTrc20',
    icon: '₮',
    type: 'crypto',
    currency: 'USDT',
    network: 'TRC20',
    requiresReference: true,
  },

  {
    id: 'bank_transfer',
    nameKey: 'payments.bankTransfer',
    icon: '🏦',
    type: 'fiat',
    currency: 'USD',
    requiresReference: true,
  },
] as const;

// ==========================================================
// HELPERS
// ==========================================================

/**
 * Determina si un locale es válido.
 */
export function isLocale(
  value: unknown,
): value is Locale {
  return (
    typeof value === 'string' &&
    locales.includes(value as Locale)
  );
}

/**
 * Devuelve la configuración de un locale.
 */
export function getLocaleConfig(
  locale: Locale,
): LocaleConfig {
  return LOCALE_CONFIG[locale];
}

/**
 * Determina si una moneda está soportada.
 */
export function isSupportedCurrency(
  value: unknown,
): value is SupportedCurrency {
  return (
    typeof value === 'string' &&
    (
      FIAT_CURRENCIES.includes(
        value as FiatCurrency,
      ) ||
      CRYPTO_CURRENCIES.includes(
        value as CryptoCurrency,
      )
    )
  );
}

/**
 * Busca la configuración de un método de pago B2B.
 */
export function getB2BPaymentMethod(
  method: B2BPaymentMethod,
): B2BPaymentOption | undefined {
  return B2B_PAYMENT_METHODS.find(
    (paymentMethod) =>
      paymentMethod.id === method,
  );
}
