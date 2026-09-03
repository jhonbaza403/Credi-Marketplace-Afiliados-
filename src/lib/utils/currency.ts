const DEFAULT_CURRENCY = "USD";
const DEFAULT_LOCALE = "es-ES";

export type CurrencyCode = string;

function normalizeCurrency(currency: CurrencyCode): string {
  const value = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new RangeError(`Código de moneda inválido: ${currency}`);
  }
  return value;
}

export function formatCurrency(
  value: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 2,
  }).format(value);
}

export function toMinorUnits(value: number, fractionDigits = 2): number {
  if (!Number.isFinite(value)) throw new RangeError("El importe debe ser finito.");
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 6) {
    throw new RangeError("fractionDigits debe estar entre 0 y 6.");
  }
  return Math.round(value * 10 ** fractionDigits);
}

export function fromMinorUnits(value: number, fractionDigits = 2): number {
  if (!Number.isInteger(value)) throw new RangeError("Las unidades menores deben ser enteras.");
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 6) {
    throw new RangeError("fractionDigits debe estar entre 0 y 6.");
  }
  return value / 10 ** fractionDigits;
}

export function isValidCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value.trim());
}
