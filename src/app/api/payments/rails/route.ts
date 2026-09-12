import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createStripeCheckoutSession } from '@/lib/payments/stripe'
import { normalizePaymentMethod } from '@/lib/payments/orchestrator'
import { getPayableOrder, paymentMetadata, railDetails } from '@/lib/payments/rail-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
const minor = (amount: number) => Math.round(amount * 100)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'UNAUTHORIZED' }, 401)
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ error: 'INVALID_JSON' }, 400) }
  const method = normalizePaymentMethod(body.method_type)
  const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : ''
  if (!method) return json({ error: 'INVALID_PAYMENT_METHOD' }, 400)
  if (!orderId) return json({ error: 'ORDER_ID_REQUIRED' }, 400)

  try {
    const order = await getPayableOrder(supabase, orderId, user.id)
    const key = typeof body.idempotency_key === 'string' && body.idempotency_key.trim() ? body.idempotency_key.trim().slice(0, 200) : `${method}_order_${order.id}_${user.id}`
    if (key.length < 16) return json({ error: 'INVALID_IDEMPOTENCY_KEY' }, 400)
    const { data: existing } = await supabase.from('payment_orchestrations').select('id,order_id,amount,currency,method_type,provider,status,provider_reference,client_reference,metadata,expires_at,created_at').eq('idempotency_key', key).maybeSingle()
    if (existing) return json({ ok: true, idempotent: true, payment: existing })

    if (method === 'stripe') {
      const { data: items, error } = await supabase.from('order_items').select('product_title,quantity,unit_price,subtotal').eq('order_id', order.id).order('created_at', { ascending: true })
      if (error || !items?.length) return json({ error: 'ORDER_ITEMS_LOOKUP_FAILED' }, 500)
      const total = items.reduce((sum, item) => sum + Number(item.subtotal), 0)
      if (minor(total) !== minor(order.amount)) return json({ error: 'ORDER_TOTAL_MISMATCH' }, 409)
      if (order.currency !== 'USD') return json({ error: 'STRIPE_CURRENCY_NOT_SUPPORTED' }, 422)
      const { data: payment, error: insertError } = await supabase.from('payment_orchestrations').insert({ user_id: user.id, order_id: order.id, amount: order.amount, currency: order.currency, method_type: 'stripe', provider: 'stripe', status: 'created', client_reference: order.id, idempotency_key: key, metadata: paymentMetadata('stripe', order.id), expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() }).select('id').single()
      if (insertError || !payment) return json({ error: 'PAYMENT_INTENT_CREATE_FAILED' }, 500)
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '')
      const session = await createStripeCheckoutSession({ orderId: order.id, userId: user.id, customerEmail: user.email, currency: order.currency, amountMinor: minor(order.amount), lineItems: items.map(item => ({ name: String(item.product_title || 'Producto Credi Marketplace'), quantity: Number(item.quantity), unitAmountMinor: minor(Number(item.unit_price)) })), successUrl: `${siteUrl}/checkout/success?order_id=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${siteUrl}/checkout?order_id=${encodeURIComponent(order.id)}`, idempotencyKey: key })
      const { data: updated } = await supabase.from('payment_orchestrations').update({ status: 'pending', provider_reference: session.id, metadata: { ...paymentMetadata('stripe', order.id), checkout_url: session.url } }).eq('id', payment.id).select('id,order_id,amount,currency,method_type,provider,status,provider_reference,client_reference,metadata,expires_at,created_at').single()
      return json({ ok: true, payment: updated, next_action: 'redirect_to_provider', checkout: { url: session.url, session_id: session.id } }, 201)
    }

    const { data: payment, error } = await supabase.from('payment_orchestrations').insert({ user_id: user.id, order_id: order.id, amount: order.amount, currency: order.currency, method_type: method, provider: method, status: method === 'manual' ? 'requires_action' : 'pending', client_reference: order.id, idempotency_key: key, metadata: paymentMetadata(method, order.id), expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() }).select('id,order_id,amount,currency,method_type,provider,status,provider_reference,client_reference,metadata,expires_at,created_at').single()
    if (error || !payment) return json({ error: 'PAYMENT_INTENT_CREATE_FAILED' }, 500)

    if (method === 'wallet') {
      const { data: result, error: walletError } = await supabase.rpc('wallet_pay_order', { p_order_id: order.id, p_idempotency_key: key })
      if (walletError) {
        const message = String(walletError.message || '')
        if (message.includes('INSUFFICIENT_FUNDS')) return json({ error: 'INSUFFICIENT_WALLET_FUNDS' }, 409)
        if (message.includes('PLATFORM_WALLET_NOT_CONFIGURED')) return json({ error: 'PLATFORM_WALLET_NOT_CONFIGURED' }, 503)
        return json({ error: 'WALLET_PAYMENT_FAILED' }, 500)
      }
      const { data: completed } = await supabase.from('payment_orchestrations').select('id,order_id,amount,currency,method_type,provider,status,provider_reference,client_reference,metadata,expires_at,created_at').eq('id', payment.id).maybeSingle()
      return json({ ok: true, payment: completed ?? payment, wallet: result, next_action: 'payment_completed' }, 201)
    }

    const reference = `${method}_${crypto.randomUUID()}`
    const rail = railDetails(method)
    const { data: updated, error: updateError } = await supabase.from('payment_orchestrations').update({ status: 'requires_action', provider_reference: reference, metadata: { ...paymentMetadata(method, order.id), rail } }).eq('id', payment.id).select('id,order_id,amount,currency,method_type,provider,status,provider_reference,client_reference,metadata,expires_at,created_at').single()
    if (updateError || !updated) return json({ error: 'PAYMENT_RECORD_UPDATE_FAILED' }, 500)
    return json({ ok: true, payment: updated, next_action: 'submit_payment_for_verification', rail }, 201)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PAYMENT_RAIL_FAILED'
    const statuses: Record<string, number> = { ORDER_NOT_FOUND: 404, ORDER_ALREADY_PAID: 409, ORDER_NOT_PAYABLE: 409, INVALID_ORDER_TOTAL: 422, INVALID_CURRENCY: 422 }
    return json({ error: statuses[code] ? code : 'PAYMENT_RAIL_FAILED' }, statuses[code] || 500)
  }
}
