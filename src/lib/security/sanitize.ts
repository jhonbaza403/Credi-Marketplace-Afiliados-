// ==========================================================
// Input Sanitization
// Credi Marketplace
// ==========================================================

export function sanitizeInput(
  value: string,
): string {
  return value
    .trim()
    .replace(
      /<script.*?>.*?<\/script>/gis,
      "",
    )
    .replace(
      /[<>]/g,
      "",
    );
}

export function sanitizeObject<
  T extends Record<string, unknown>,
>(
  object: T,
): T {
  const result: Partial<T> = {};

  for (const key of Object.keys(object) as Array<
    Extract<keyof T, string>
  >) {
    const value = object[key];

    result[key] =
      typeof value === "string"
        ? (sanitizeInput(value) as T[typeof key])
        : (value as T[typeof key]);
  }

  return result as T;
}
