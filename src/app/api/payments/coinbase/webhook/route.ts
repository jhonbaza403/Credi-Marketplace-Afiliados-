import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

function verifyCoinbaseWebhook(body: string, signatureHeader: string, secret: string, maxAgeSeconds = 300) {
  const parts = new Map<string, string>()
  for (const part of signatureHeader.split(',')) {
    const index = part.indexOf('=')
    if (index <= 0) continue
    parts.set(part.slice(0, index).trim(), part.slice(index + 1).trim())
  }
  const timestamp = parts.get('t')
  const provided = parts.get('v0')
  if (!timestamp || !provided || !/^\d+$/.test(timestamp)) return false
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > maxAgeSeconds) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const providedBuffer = Buffer.from(provided, 'hex')
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer)
}

type CoinbaseEvent = {
  id?: string
  eventType?: string
  type?: string
  status?: string
  amount?: string
  currency?: string
  network?: string
  transactionHash?: string
  updatedAt?: string
  expiresAt?: string
  metadata?: Record<string, string>
  settlement?: { totalAmount?: string; netAmount?: string; feeAmount?: string; currency?: string }
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-hook0-signature')
  const secret = process.env.COINBASE_BUSINESS_WEBHOOK_SECRET?.trim()
  if (!signature) return json({ error: 'MISSING_SIGNATURE' }, 400)
  if (!secret) return json({ error: 'WEBHOOK_NOT_CONFIGURED' }, 503)
  if (!verifyCoinbaseWebhook(body, signature, secret)) return json({ error: 'INVALID_SIGNATURE' }, 400)

  let event: CoinbaseEvent
  try { event = JSON.parse(body) as CoinbaseEvent } catch { return json({ error: 'INVALID_JSON' }, 400) }

  const eventType = String(event.eventType || event.type || '').trim()
  const checkoutId = typeof event.id === 'string' ? event.id.trim() : ''
  const orderId = event.metadata?.orderId?.trim() || ''
  if (!checkoutId || !eventType) return json({ error: 'INVALID_EVENT' }, 400)

  const db = createServiceClient()
  const { data: payment, error: paymentError } = await db.from('payment_orchestrations').select('id,order_id,user_id,amount,currency,method_type,provider,status,provider_reference,metadata').eq('method_type', 'crypto').eq('provider', 'coinbase_business').eq('provider_reference', checkoutId).maybeSingle()
  if (paymentError) return json({ error: 'PAYMENT_LOOKUP_FAILED' }, 500)
  if (!payment) return json({ ok: true, ignored: true, reason: 'UNKNOWN_CHECKOUT', checkout_id: checkoutId })

  if (orderId && payment.order_id && orderId !== payment.order_id) return json({ error: 'ORDER_MISMATCH' }, 409)
  const expectedAmount = Number(payment.amount)
  const receivedAmount = Number(event.amount)
  const normalizedCurrency = String(event.currency || '').toUpperCase()
  if (!Number.isFinite(receivedAmount) || Math.round(receivedAmount * 100) !== Math.round(expectedAmount * 100) || normalizedCurrency !== 'USDC') {
    return json({ error: 'PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH' }, 409)
  }

  if (eventType === 'checkout.payment.success') {
    if (payment.status !== 'succeeded') {
      if (!payment.order_id) return json({ error: 'ORDER_REQUIRED_FOR_SETTLEMENT' }, 422)
      const { data: order } = await db.from('orders').select('id,buyer_id,total_amount,currency,status,payment_status').eq('id', payment.order_id).maybeSingle()
      if (!order) return json({ error: 'ORDER_NOT_FOUND' }, 404)
      if (Math.round(Number(order.total_amount) * 100) !== Math.round(expectedAmount * 100)) return json({ error: 'ORDER_TOTAL_MISMATCH' }, 409)
      if (!['USD', 'USDC'].includes(String(order.currency || '').toUpperCase())) return json({ error: 'ORDER_CURRENCY_NOT_SUPPORTED' }, 422)

      const now = new Date().toISOString()
      if (order.status === 'pending' && order.payment_status === 'pending') {
        const { error: orderError } = await db.from('orders').update({ status: 'paid', payment_status: 'paid', paid_at: now, updated_at: now }).eq('id', order.id).eq('status', 'pending').eq('payment_status', 'pending')
        if (orderError) return json({ error: 'ORDER_SETTLEMENT_FAILED' }, 500)
        await db.from('order_status_history').insert({ order_id: order.id, from_status: 'pending', to_status: 'paid', changed_by: payment.user_id, reason: 'crypto_coinbase_payment_confirmed', metadata: { payment_id: payment.id, checkout_id: checkoutId, transaction_hash: event.transactionHash || null } })
        await db.from('commerce_events').insert({ user_id: order.buyer_id, event_type: 'order_paid', amount: expectedAmount, currency: String(order.currency || 'USD').toUpperCase(), metadata: { provider: 'coinbase_business', payment_id: payment.id, checkout_id: checkoutId, transaction_hash: event.transactionHash || null, settlement: event.settlement || null } })
      }

      await db.from('payment_orchestrations').update({ status: 'succeeded', updated_at: now, metadata: { ...(payment.metadata || {}), checkout_status: 'COMPLETED', transaction_hash: event.transactionHash || null, settlement: event.settlement || null, last_webhook_event: eventType, last_webhook_at: now } }).eq('id', payment.id).in('status', ['created', 'pending', 'requires_action'])
    }
    return json({ ok: true, status: 'succeeded', payment_id: payment.id, order_id: payment.order_id, checkout_id: checkoutId })
  }

  if (['checkout.payment.failed', 'checkout.payment.expired'].includes(eventType)) {
    if (['succeeded'].includes(payment.status)) return json({ ok: true, ignored: true, reason: 'ALREADY_SUCCEEDED', payment_id: payment.id })
    const now = new Date().toISOString()
    await db.from('payment_orchestrations').update({ status: eventType.endsWith('.expired') ? 'expired' : 'failed', updated_at: now, metadata: { ...(payment.metadata || {}), checkout_status: event.status || eventType, last_webhook_event: eventType, last_webhook_at: now } }).eq('id', payment.id).in('status', ['created', 'pending', 'requires_action'])
    return json({ ok: true, status: eventType.endsWith('.expired') ? 'expired' : 'failed', payment_id: payment.id, checkout_id: checkoutId })
  }

  if (eventType === 'checkout.refund.success') {
    const now = new Date().toISOString()
    await db.from('payment_orchestrations').update({ updated_at: now, metadata: { ...(payment.metadata || {}), checkout_status: event.status || 'REFUNDED', refunded_amount: event.amount || null, refund_transaction_hash: event.transactionHash || null, last_webhook_event: eventType, last_webhook_at: now } }).eq('id', payment.id)
    return json({ ok: true, status: 'refund_recorded', payment_id: payment.id, checkout_id: checkoutId })
  }

  return json({ ok: true, ignored: true, event_type: eventType, payment_id: payment.id })
}
