const VALIDATION_LIMITS = {
  quantity: { min: 1, max: 10000 },
  rating: { min: 1, max: 5 },
} as const;

export function isValidEmail(email: string | undefined | null): boolean {
  if (typeof email !== "string") return false;
  const normalized = email.trim();
  if (!normalized || normalized.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function isValidQuantity(
  quantity: number | undefined | null,
): boolean {
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity)
  ) {
    return false;
  }
  return (
    quantity >= VALIDATION_LIMITS.quantity.min &&
    quantity <= VALIDATION_LIMITS.quantity.max
  );
}

export function isValidStock(
  stock: number | undefined | null,
): boolean {
  if (
    typeof stock !== "number" ||
    !Number.isInteger(stock)
  ) {
    return false;
  }
  return stock >= 0 && stock <= VALIDATION_LIMITS.quantity.max;
}

export function isValidRating(
  rating: number | undefined | null,
): boolean {
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating)
  ) {
    return false;
  }
  return (
    rating >= VALIDATION_LIMITS.rating.min &&
    rating <= VALIDATION_LIMITS.rating.max
  );
}
