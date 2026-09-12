import { NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'
import { verifyStripeWebhookSignature } from '@/lib/payments/stripe'
import { logger } from '@/lib/logging'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_WEBHOOK_SIZE = 512_000

type StripeCheckoutSession = {
  id: string
  payment_status?: string
  amount_total?: number | null
  currency?: string | null
  metadata?: Record<string, string> | null
}

type StripeEvent = {
  id: string
  type: string
  data?: { object?: StripeCheckoutSession }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  try {
    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonResponse({ success: false, error: 'Webhook debe utilizar JSON.' }, 415)
    }

    const contentLength = request.headers.get('content-length')
    if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_WEBHOOK_SIZE) {
      return jsonResponse({ success: false, error: 'Webhook demasiado grande.' }, 413)
    }

    const rawBody = await request.text()
    if (rawBody.length > MAX_WEBHOOK_SIZE) return jsonResponse({ success: false, error: 'Webhook demasiado grande.' }, 413)

    const signature = request.headers.get('stripe-signature')
    if (!verifyStripeWebhookSignature(rawBody, signature)) {
      logger.warn('Stripe webhook rejected: invalid signature', { requestId, action: 'stripe_webhook_signature_invalid' })
      return jsonResponse({ success: false, error: 'Firma de webhook inválida.' }, 400)
    }

    let event: StripeEvent
    try {
      event = JSON.parse(rawBody) as StripeEvent
    } catch {
      return jsonResponse({ success: false, error: 'JSON de webhook inválido.' }, 400)
    }

    if (!event.id || !event.type) return jsonResponse({ success: false, error: 'Evento Stripe incompleto.' }, 400)

    const supabase = createServiceClient()
    const payloadHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawBody))
    const payloadHash = Array.from(new Uint8Array(payloadHashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')

    const { data: insertedEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        provider: 'stripe',
        event_id: event.id,
        event_type: event.type,
        signature,
        payload_hash: payloadHash,
        payload: event,
        status: 'received',
      })
      .select('id')
      .maybeSingle()

    if (insertError?.code === '23505') {
      return jsonResponse({ success: true, received: true, duplicate: true })
    }
    if (insertError || !insertedEvent) {
      logger.error('Stripe webhook persistence failed', { requestId, action: 'stripe_webhook_persist_failed', metadata: insertError?.message ?? 'unknown' })
      return jsonResponse({ success: false, error: 'No fue posible registrar el webhook.' }, 500)
    }

    await supabase
      .from('webhook_events')
      .update({ status: 'processing', processing_attempts: 1 })
      .eq('id', insertedEvent.id)

    try {
      const session = event.data?.object
      const orderId = session?.metadata?.order_id

      if (event.type === 'checkout.session.completed' && session && orderId) {
        if (session.payment_status !== 'paid') {
          throw new Error('checkout_session_not_paid')
        }

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, buyer_id, status, payment_status, total_amount, currency')
          .eq('id', orderId)
          .maybeSingle()

        if (orderError || !order) throw new Error('order_not_found')

        const expectedAmountMinor = Math.round(Number(order.total_amount) * 100)
        if (!Number.isFinite(expectedAmountMinor) || expectedAmountMinor <= 0 || session.amount_total !== expectedAmountMinor) {
          throw new Error('stripe_amount_mismatch')
        }
        if ((session.currency || '').toUpperCase() !== String(order.currency || 'USD').trim().toUpperCase()) {
          throw new Error('stripe_currency_mismatch')
        }
        if (session.metadata?.user_id && session.metadata.user_id !== order.buyer_id) {
          throw new Error('stripe_buyer_mismatch')
        }

        const { data: payment } = await supabase
          .from('payment_orchestrations')
          .select('id, status, order_id')
          .eq('provider', 'stripe')
          .eq('provider_reference', session.id)
          .maybeSingle()

        if (!payment || payment.order_id !== order.id) throw new Error('payment_orchestration_not_found')

        await supabase
          .from('payment_orchestrations')
          .update({ status: 'succeeded', updated_at: new Date().toISOString() })
          .eq('id', payment.id)

        if (order.status === 'pending') {
          const { error: updateOrderError } = await supabase
            .from('orders')
            .update({
              status: 'paid',
              payment_status: 'paid',
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id)
            .eq('status', 'pending')

          if (updateOrderError) throw new Error(`order_update_failed:${updateOrderError.message}`)

          await supabase.from('commerce_events').insert({
            user_id: order.buyer_id,
            event_type: 'order_paid',
            amount: Number(order.total_amount),
            currency: String(order.currency || 'USD').trim(),
            metadata: { provider: 'stripe', session_id: session.id, webhook_event_id: event.id },
          })
        }
      }

      if ((event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') && session && orderId) {
        const { data: order } = await supabase
          .from('orders')
          .select('id, status')
          .eq('id', orderId)
          .maybeSingle()

        if (order?.status === 'pending') {
          await supabase
            .from('orders')
            .update({
              status: 'failed',
              payment_status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id)
            .eq('status', 'pending')
        }

        if (session.id) {
          await supabase
            .from('payment_orchestrations')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('provider', 'stripe')
            .eq('provider_reference', session.id)
        }
      }

      await supabase
        .from('webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString(), processing_attempts: 1 })
        .eq('id', insertedEvent.id)

      return jsonResponse({ success: true, received: true, processed: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error'
      await supabase
        .from('webhook_events')
        .update({ status: 'failed', failed_at: new Date().toISOString(), error_message: message.slice(0, 1000), processing_attempts: 1 })
        .eq('id', insertedEvent.id)

      logger.error('Stripe webhook processing failed', { requestId, action: 'stripe_webhook_processing_failed', metadata: message })
      return jsonResponse({ success: false, error: 'No fue posible procesar el evento de pago.' }, 500)
    }
  } catch (error) {
    logger.error('Stripe webhook handler error', { requestId, action: 'stripe_webhook_error', metadata: error instanceof Error ? error.message : 'Unknown error' })
    return jsonResponse({ success: false, error: 'Webhook inválido.' }, 400)
  }
}
