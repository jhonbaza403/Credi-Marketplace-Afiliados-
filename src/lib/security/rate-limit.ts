export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

export interface RateLimitStore {
  increment(
    key: string,
    windowMs: number,
  ): Promise<{
    count: number
    resetAt: number
  }>
}

/**
 * Store local únicamente para desarrollo.
 *
 * NO debe considerarse una solución distribuida
 * de producción.
 */
class MemoryRateLimitStore
  implements RateLimitStore
{
  private readonly entries = new Map<
    string,
    {
      count: number
      resetAt: number
    }
  >()

  async increment(
    key: string,
    windowMs: number,
  ) {
    const now = Date.now()
    const existing = this.entries.get(key)

    if (
      !existing ||
      existing.resetAt <= now
    ) {
      const entry = {
        count: 1,
        resetAt: now + windowMs,
      }

      this.entries.set(key, entry)

      return entry
    }

    existing.count += 1

    return existing
  }
}

const memoryStore =
  new MemoryRateLimitStore()

export async function rateLimit(
  key: string,
  options: {
    limit: number
    windowMs: number
    store?: RateLimitStore
  },
): Promise<RateLimitResult> {
  const store =
    options.store ?? memoryStore

  const result = await store.increment(
    key,
    options.windowMs,
  )

  const remaining = Math.max(
    0,
    options.limit - result.count,
  )

  return {
    success: result.count <= options.limit,
    limit: options.limit,
    remaining,
    resetAt: result.resetAt,
  }
}
