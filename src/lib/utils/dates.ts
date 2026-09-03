export type DateInput = string | number | Date;

export function toValidDate(value: DateInput): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: DateInput, locale = "es-ES"): string {
  const date = toValidDate(value);
  return date ? new Intl.DateTimeFormat(locale).format(date) : "—";
}

export function formatDateTime(value: DateInput, locale = "es-ES"): string {
  const date = toValidDate(value);
  return date
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "—";
}

export function toISOString(value: DateInput): string | null {
  const date = toValidDate(value);
  return date?.toISOString() ?? null;
}

export function isValidDate(value: unknown): value is DateInput {
  if (!(typeof value === "string" || typeof value === "number" || value instanceof Date)) return false;
  return toValidDate(value) !== null;
}
