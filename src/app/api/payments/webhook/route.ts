
import { createServiceClient } from '@/lib/supabase/service'
import { verifyStripeWebhookSignature } from '@/lib/payments/stripe'
import { logger } from '@/lib/logging'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function jsonResponse(body: Record<string, unknown>, status = 200, requestId?: string) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(requestId ? { 'X-Request-ID': requestId } : {}),
    },
  })
}

function requestIdFrom(request: Request) {
  const supplied = request.headers.get('x-request-id')?.trim()
  return supplied && /^[A-Za-z0-9._:-]{8,128}$/.test(supplied) ? supplied : crypto.randomUUID()
}

type StripeEvent = {
  id?: string
  type?: string
  data?: {
    object?: {
      id?: string
      payment_status?: string
      amount_total?: number | null
      currency?: string | null
      metadata?: Record<string, string> | null
    }
  }
}

export async function POST(request: Request) {
  const requestId = requestIdFrom(request)

  try {
    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonResponse({ success: false, error: 'Webhook debe utilizar JSON.' }, 415, requestId)
    }

    const rawBody = await request.text()
    if (rawBody.length > 512_000) {
      return jsonResponse({ success: false, error: 'Webhook demasiado grande.' }, 413, requestId)
    }

    const signature = request.headers.get('stripe-signature')
    if (!verifyStripeWebhookSignature(rawBody, signature)) {
      logger.warn('Invalid Stripe webhook signature', {
        requestId,
        action: 'stripe_webhook_invalid_signature',
      })
      return jsonResponse({ success: false, error: 'Firma de webhook inválida.' }, 400, requestId)
    }

    let event: StripeEvent
    try {
      event = JSON.parse(rawBody) as StripeEvent
    } catch {
      return jsonResponse({ success: false, error: 'JSON de webhook inválido.' }, 400, requestId)
    }

    if (!event.id || !event.type) {
      return jsonResponse({ success: false, error: 'Evento Stripe incompleto.' }, 400, requestId)
    }

    const session = event.data?.object
    const supabase = createServiceClient()
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawBody))
    const payloadHash = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')

    let webhookId: string | null = null

    const { data: inserted, error: insertError } = await supabase
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
      .select('id,status')
      .maybeSingle()

    if (!insertError && inserted) {
      webhookId = inserted.id
    } else if (insertError?.code === '23505') {
      const { data: existing, error: existingError } = await supabase
        .from('webhook_events')
        .select('id,status,processing_attempts,created_at')
        .eq('provider', 'stripe')
        .eq('event_id', event.id)
        .maybeSingle()

      if (existingError || !existing) {
        return jsonResponse({ success: false, error: 'No fue posible recuperar el webhook duplicado.' }, 500, requestId)
      }

      if (existing.status === 'processed') {
        return jsonResponse({ success: true, received: true, processed: true, duplicate: true }, 200, requestId)
      }

      if (existing.status === 'processing') {
        const ageMs = Date.now() - new Date(existing.created_at).getTime()
        if (ageMs < 10 * 60 * 1000) {
          return jsonResponse({ success: true, received: true, processing: true, duplicate: true }, 200, requestId)
        }
      }

      const { data: claimed, error: claimError } = await supabase
        .from('webhook_events')
        .update({
          status: 'processing',
          processing_attempts: (existing.processing_attempts ?? 0) + 1,
          failed_at: null,
          error_message: null,
        })
        .eq('id', existing.id)
        .neq('status', 'processed')
        .select('id')
        .maybeSingle()

      if (claimError || !claimed) {
        return jsonResponse({ success: true, received: true, processing: true, duplicate: true }, 200, requestId)
      }

      webhookId = claimed.id
    } else if (insertError || !inserted) {
      return jsonResponse({ success: false, error: 'No fue posible registrar el webhook.' }, 500, requestId)
    }

    if (!webhookId) {
      return jsonResponse({ success: false, error: 'Webhook sin identificador interno.' }, 500, requestId)
    }

    if (inserted) {
      const { error: claimError } = await supabase
        .from('webhook_events')
        .update({ status: 'processing', processing_attempts: 1 })
        .eq('id', webhookId)
        .eq('status', 'received')

      if (claimError) {
        return jsonResponse({ success: false, error: 'No fue posible iniciar el procesamiento del webhook.' }, 500, requestId)
      }
    }

    try {
      const orderId = session?.metadata?.order_id
      const userId = session?.metadata?.user_id

      if (event.type === 'checkout.session.completed') {
        if (!session?.id || !orderId || !userId || session.payment_status !== 'paid') {
          throw new Error('checkout_session_not_payable')
        }
        if (session.amount_total == null || !session.currency) {
          throw new Error('checkout_session_amount_or_currency_missing')
        }

        const { error } = await supabase.rpc('process_stripe_checkout_session', {
          p_order_id: orderId,
          p_session_id: session.id,
          p_event_id: event.id,
          p_amount_total: session.amount_total,
          p_currency: session.currency,
          p_buyer_id: userId,
        })

        if (error) throw new Error(error.message || 'stripe_checkout_processing_failed')
      }

      if (
        (event.type === 'checkout.session.expired' ||
          event.type === 'checkout.session.async_payment_failed') &&
        session?.id &&
        orderId
      ) {
        const { error } = await supabase.rpc('process_stripe_checkout_failure', {
          p_order_id: orderId,
          p_session_id: session.id,
        })
        if (error) throw new Error(error.message || 'stripe_checkout_failure_processing_failed')
      }

      const { error: processedError } = await supabase
        .from('webhook_events')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', webhookId)

      if (processedError) throw new Error(processedError.message)

      return jsonResponse(
        { success: true, received: true, processed: true, eventType: event.type },
        200,
        requestId,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error'

      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: message.slice(0, 1000),
        })
        .eq('id', webhookId)

      logger.error('Stripe webhook processing failed', {
        requestId,
        action: 'stripe_webhook_processing_failed',
        metadata: message,
      })

      return jsonResponse(
        { success: false, error: 'No fue posible procesar el evento de pago.' },
        500,
        requestId,
      )
    }
  } catch (error) {
    logger.error('Stripe webhook handler error', {
      requestId,
      action: 'stripe_webhook_error',
      metadata: error instanceof Error ? error.message : 'Unknown error',
    })
    return jsonResponse({ success: false, error: 'Webhook inválido.' }, 400, requestId)
  }
}
