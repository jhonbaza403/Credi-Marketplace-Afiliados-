export const VALIDATION_LIMITS = {
  email: { maxLength: 254 },
  name: { minLength: 2, maxLength: 200 },
  slug: { minLength: 1, maxLength: 150 },
  quantity: { min: 1, max: 10_000 },
  stock: { min: 0, max: 10_000 },
  rating: { min: 1, max: 5 },
} as const;

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const email = value.trim();
  return email.length > 0 && email.length <= VALIDATION_LIMITS.email.maxLength && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isNonEmptyString(value: unknown, minLength = 1, maxLength = 10_000): value is string {
  return typeof value === "string" && value.trim().length >= minLength && value.trim().length <= maxLength;
}

export function isValidQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= VALIDATION_LIMITS.quantity.min && value <= VALIDATION_LIMITS.quantity.max;
}

export function isValidStock(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= VALIDATION_LIMITS.stock.min && value <= VALIDATION_LIMITS.stock.max;
}

export function isValidRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= VALIDATION_LIMITS.rating.min && value <= VALIDATION_LIMITS.rating.max;
}

export function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && value.length >= VALIDATION_LIMITS.slug.minLength && value.length <= VALIDATION_LIMITS.slug.maxLength && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
