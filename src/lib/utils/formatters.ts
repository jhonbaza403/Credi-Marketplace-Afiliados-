export function formatCurrency(value: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}

export function formatDate(value: string | number | Date, locale = "es-ES"): string {
  return new Intl.DateTimeFormat(locale).format(new Date(value));
}
