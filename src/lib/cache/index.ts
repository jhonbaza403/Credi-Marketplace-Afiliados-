const memoryCache = new Map<string, { value: unknown; expiresAt?: number }>();

export function getCache<T>(key: string): T | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs?: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: ttlMs && ttlMs > 0 ? Date.now() + ttlMs : undefined,
  });
}

export function deleteCache(key: string): void {
  memoryCache.delete(key);
}
