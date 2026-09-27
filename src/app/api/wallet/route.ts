import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const transferSchema = z.object({
  to_user_id: z.string().uuid(),
  amount: z.number().finite().positive().max(1_000_000),
  currency: z.string().regex(/^[A-Za-z]{3}$/).transform((v) => v.toUpperCase()),
  idempotency_key: z.string().trim().min(16).max(200).optional(),
})

function json(data: unknown, status = 200, requestId?: string) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(requestId ? { 'X-Request-ID': requestId } : {}),
    },
  })
}

export async function GET(_request: Request) {
  const requestId = crypto.randomUUID()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED', request_id: requestId }, 401, requestId)

  const { data, error } = await supabase.rpc('ensure_my_wallet')
  if (error) return json({ error: 'WALLET_UNAVAILABLE', request_id: requestId }, 503, requestId)

  const { data: ledger } = await supabase
    .from('wallet_ledger')
    .select('id,direction,amount,currency,entry_type,reference_type,reference_id,metadata,created_at')
    .eq('wallet_id', data.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return json({ wallet: data, ledger: ledger ?? [], request_id: requestId }, 200, requestId)
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  if (!isSameOrigin(request)) return json({ error: 'CSRF_VALIDATION_FAILED', request_id: requestId }, 403, requestId)
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return json({ error: 'UNSUPPORTED_MEDIA_TYPE', request_id: requestId }, 415, requestId)
  }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED', request_id: requestId }, 401, requestId)

  const limit = await distributedRateLimit(supabase, `wallet:${auth.user.id}:${getRequestIp(request)}`, { limit: 20, windowMs: 60_000 })
  if (!limit.success) return json({ error: 'RATE_LIMITED', request_id: requestId }, 429, requestId)

  let raw: unknown
  try { raw = await request.json() } catch { return json({ error: 'INVALID_JSON', request_id: requestId }, 400, requestId) }
  const parsed = transferSchema.safeParse(raw)
  if (!parsed.success) return json({ error: 'INVALID_TRANSFER', request_id: requestId }, 422, requestId)

  if (parsed.data.to_user_id === auth.user.id) {
    return json({ error: 'SELF_TRANSFER_NOT_ALLOWED', request_id: requestId }, 409, requestId)
  }

  const idempotencyKey = parsed.data.idempotency_key ?? request.headers.get('Idempotency-Key')?.trim() ?? requestId
  if (idempotencyKey.length < 16 || idempotencyKey.length > 200) {
    return json({ error: 'INVALID_IDEMPOTENCY_KEY', request_id: requestId }, 400, requestId)
  }

  const { data, error } = await supabase.rpc('wallet_transfer', {
    p_to_user_id: parsed.data.to_user_id,
    p_amount: parsed.data.amount,
    p_currency: parsed.data.currency,
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    const code = /INSUFFICIENT_FUNDS|INVALID_RECIPIENT|WALLET_NOT_ACTIVE|CURRENCY_MISMATCH/.exec(error.message)?.[0] ?? 'WALLET_TRANSFER_FAILED'
    return json({ error: code, request_id: requestId }, code === 'INSUFFICIENT_FUNDS' ? 409 : 400, requestId)
  }

  return json({ ok: true, transfer: data, request_id: requestId }, 201, requestId)
}
