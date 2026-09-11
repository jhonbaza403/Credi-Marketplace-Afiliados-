import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPaymentMetadata, isValidMoney, normalizePaymentMethod } from '@/lib/payments/orchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)
  const { data, error } = await supabase.from('payment_orchestrations').select('id,order_id,amount,currency,method_type,provider,status,provider_reference,client_reference,metadata,expires_at,created_at,updated_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(100)
  if (error) return json({ error: 'PAYMENTS_UNAVAILABLE' }, 500)
  return json({ payments: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const amount = Number(body.amount)
  const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'USD'
  const method = normalizePaymentMethod(body.method_type)
  const idempotencyKey = typeof body.idempotency_key === 'string' && body.idempotency_key.trim() ? body.idempotency_key.trim().slice(0, 200) : crypto.randomUUID()
  const clientReference = typeof body.client_reference === 'string' ? body.client_reference.trim().slice(0, 200) : null
  const orderId = typeof body.order_id === 'string' && body.order_id ? body.order_id : null
  if (!isValidMoney(amount)) return json({ error: 'INVALID_AMOUNT' }, 400)
  if (!/^[A-Z]{3}$/.test(currency)) return json({ error: 'INVALID_CURRENCY' }, 400)

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const metadata = buildPaymentMetadata({
    source: 'payment-orchestrator',
    requested_method: method,
    requested_at: new Date().toISOString(),
  })

  const { data: payment, error } = await supabase.from('payment_orchestrations').insert({
    user_id: auth.user.id,
    order_id: orderId,
    amount,
    currency,
    method_type: method,
    provider: method === 'stripe' ? 'stripe' : method === 'crypto' ? 'crypto' : method,
    status: method === 'manual' ? 'requires_action' : 'pending',
    client_reference: clientReference,
    idempotency_key: idempotencyKey,
    metadata,
    expires_at: expiresAt,
  }).select('id,order_id,amount,currency,method_type,provider,status,client_reference,metadata,expires_at,created_at').single()

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase.from('payment_orchestrations').select('id,order_id,amount,currency,method_type,provider,status,client_reference,metadata,expires_at,created_at').eq('idempotency_key', idempotencyKey).maybeSingle()
      if (existing) return json({ idempotent: true, payment: existing })
    }
    return json({ error: 'PAYMENT_INTENT_CREATE_FAILED' }, 500)
  }
  return json({ ok: true, payment, next_action: method === 'stripe' ? 'open_billing_checkout' : method === 'crypto' ? 'open_crypto_checkout' : method === 'wallet' ? 'wallet_authorization' : method === 'bank_transfer' ? 'await_bank_reference' : 'manual_confirmation' }, 201)
}
