import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

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
  ): Promise<{ count: number; resetAt: number }>
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>()

  async increment(key: string, windowMs: number) {
    const now = Date.now()
    const existing = this.entries.get(key)
    if (!existing || existing.resetAt <= now) {
      const entry = { count: 1, resetAt: now + windowMs }
      this.entries.set(key, entry)
      return entry
    }
    existing.count += 1
    return existing
  }
}

const memoryStore = new MemoryRateLimitStore()

export async function rateLimit(key: string, options: { limit: number; windowMs: number; store?: RateLimitStore }): Promise<RateLimitResult> {
  const result = await (options.store ?? memoryStore).increment(key, options.windowMs)
  return {
    success: result.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - result.count),
    resetAt: result.resetAt,
  }
}

export async function distributedRateLimit(
  supabase: SupabaseClient,
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  if (!key.trim()) throw new Error('RATE_LIMIT_KEY_REQUIRED')
  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000))
  const { data, error } = await supabase.rpc('consume_api_rate_limit', {
    p_key: key.trim(),
    p_limit: options.limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    throw new Error('RATE_LIMIT_STORE_UNAVAILABLE')
  }
  const row = Array.isArray(data) ? data[0] : data
  const resetAt = row?.reset_at ? new Date(row.reset_at).getTime() : Date.now() + options.windowMs
  return {
    success: Boolean(row?.allowed),
    limit: options.limit,
    remaining: Math.max(0, Number(row?.remaining ?? 0)),
    resetAt,
  }
}
