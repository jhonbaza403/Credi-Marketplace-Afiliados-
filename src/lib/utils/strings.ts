export function trimTo(value: string | null | undefined, maxLength: number): string {
  if (!value) return "";
  if (!Number.isInteger(maxLength) || maxLength < 0) throw new RangeError("maxLength inválido.");
  return value.trim().slice(0, maxLength);
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function slugify(value: string): string {
  return normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalize(value: string): string {
  const normalized = value.trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "";
}

export function truncate(value: string, maxLength: number, suffix = "…"): string {
  if (value.length <= maxLength) return value;
  if (maxLength <= suffix.length) return suffix.slice(0, maxLength);
  return `${value.slice(0, maxLength - suffix.length).trimEnd()}${suffix}`;
}
