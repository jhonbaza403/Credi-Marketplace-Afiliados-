import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPaymentMetadata, normalizePaymentMethod } from '@/lib/payments/orchestrator'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)
  const { data, error } = await supabase.from('payment_orchestrations').select('id,order_id,amount,currency,method_type,provider,status,provider_reference,client_reference,metadata,expires_at,created_at,updated_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(100)
  if (error) return json({ error: 'PAYMENTS_UNAVAILABLE' }, 500)
  const payments = data ?? []
  return json({ payments, data_state: payments.length ? 'available' : 'empty', message: payments.length ? undefined : 'No existen operaciones de pago registradas para esta cuenta.' })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return json({ error: 'UNAUTHORIZED' }, 401)

  const limit = await distributedRateLimit(supabase, `payment-orchestrator:${auth.user.id}:${getRequestIp(request)}`, { limit: 20, windowMs: 60_000 })
  if (!limit.success) return json({ error: 'RATE_LIMITED' }, 429)

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'INVALID_JSON' }, 400) }

  const method = normalizePaymentMethod(body.method_type)
  const idempotencyKey = typeof body.idempotency_key === 'string' && body.idempotency_key.trim() ? body.idempotency_key.trim().slice(0, 200) : crypto.randomUUID()
  const clientReference = typeof body.client_reference === 'string' ? body.client_reference.trim().slice(0, 200) : null
  const orderId = typeof body.order_id === 'string' && body.order_id ? body.order_id : null
  if (!orderId) return json({ error: 'ORDER_ID_REQUIRED' }, 400)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,buyer_id,total_amount,currency,status')
    .eq('id', orderId)
    .eq('buyer_id', auth.user.id)
    .maybeSingle()
  if (orderError) return json({ error: 'ORDER_LOOKUP_FAILED' }, 500)
  if (!order) return json({ error: 'ORDER_NOT_FOUND' }, 404)
  if (order.status !== 'pending') return json({ error: 'ORDER_NOT_PAYABLE' }, 409)

  const amount = Number(order.total_amount)
  const currency = typeof order.currency === 'string' ? order.currency.trim().toUpperCase() : ''
  if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'INVALID_ORDER_TOTAL' }, 409)
  if (!/^[A-Z]{3}$/.test(currency)) return json({ error: 'INVALID_ORDER_CURRENCY' }, 409)

  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('quantity,unit_price,subtotal')
    .eq('order_id', orderId)
  if (itemsError || !orderItems?.length) return json({ error: 'ORDER_ITEMS_UNAVAILABLE' }, 409)
  const itemTotal = orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
  if (!Number.isFinite(itemTotal) || Math.round(itemTotal * 100) !== Math.round(amount * 100)) {
    return json({ error: 'ORDER_TOTAL_MISMATCH' }, 409)
  }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const metadata = buildPaymentMetadata({ source: 'payment-orchestrator', requested_method: method, requested_at: new Date().toISOString(), server_derived_amount: true })
  const { data: payment, error } = await supabase.from('payment_orchestrations').insert({
    user_id: auth.user.id,
    order_id: order.id,
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
