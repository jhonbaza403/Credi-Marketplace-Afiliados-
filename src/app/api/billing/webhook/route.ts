import { createAdminClient } from '@/lib/supabase/admin'
import { stripeRequest, verifyStripeWebhookSignature, type StripeEvent, type StripeSubscription } from '@/lib/billing/stripe'
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

function iso(s: number | null | undefined) {
  return typeof s === 'number' ? new Date(s * 1000).toISOString() : null
}

function statusOf(s: string) {
  switch (s) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'paused':
    case 'incomplete':
    case 'incomplete_expired':
      return s
    case 'canceled':
      return 'cancelled'
    default:
      return 'expired'
  }
}

function meta(o: Record<string, unknown>) {
  const m = o.metadata
  if (!m || typeof m !== 'object') return {}
  return Object.fromEntries(
    Object.entries(m as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

type BillingEventObject = Record<string, unknown> & {
  id?: string
  amount_total?: number | null
  currency?: string | null
  payment_status?: string | null
  subscription?: string | null
  customer?: string | null
  metadata?: Record<string, string> | null
}

type ClaimResult =
  | { state: 'claimed'; id: string }
  | { state: 'duplicate'; id: string }
  | { state: 'processing'; id: string }

async function claimEvent(
  admin: ReturnType<typeof createAdminClient>,
  event: StripeEvent,
): Promise<ClaimResult> {
  const now = new Date().toISOString()
  const { data: inserted, error: insertError } = await admin
    .from('subscription_events')
    .insert({
      subscription_id: null,
      user_id: null,
      event_type: event.type,
      provider: 'stripe',
      provider_event_id: event.id,
      payload: event.data.object,
      occurred_at: now,
      status: 'processing',
      processing_started_at: now,
    })
    .select('id')
    .maybeSingle()

  if (!insertError && inserted) return { state: 'claimed', id: inserted.id }

  if (insertError?.code !== '23505') {
    throw insertError ?? new Error('subscription_event_claim_failed')
  }

  const { data: existing, error: existingError } = await admin
    .from('subscription_events')
    .select('id,status,processing_started_at')
    .eq('provider', 'stripe')
    .eq('provider_event_id', event.id)
    .maybeSingle()

  if (existingError || !existing) {
    throw existingError ?? new Error('subscription_event_not_found_after_conflict')
  }

  if (existing.status === 'processed') return { state: 'duplicate', id: existing.id }

  if (existing.status === 'processing') {
    const started = existing.processing_started_at
      ? new Date(existing.processing_started_at).getTime()
      : 0
    if (Date.now() - started < 10 * 60 * 1000) return { state: 'processing', id: existing.id }

    const staleCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    let query = admin
      .from('subscription_events')
      .update({ status: 'processing', processing_started_at: now, failed_at: null, error_message: null })
      .eq('id', existing.id)
      .eq('status', 'processing')
      .lt('processing_started_at', staleCutoff)

    if (existing.processing_started_at) query = query.eq('processing_started_at', existing.processing_started_at)

    const { data: reclaimed, error: reclaimError } = await query.select('id').maybeSingle()
    if (reclaimError || !reclaimed) return { state: 'processing', id: existing.id }
    return { state: 'claimed', id: reclaimed.id }
  }

  const { data: claimed, error: claimError } = await admin
    .from('subscription_events')
    .update({ status: 'processing', processing_started_at: now, failed_at: null, error_message: null })
    .eq('id', existing.id)
    .in('status', ['received', 'failed'])
    .select('id')
    .maybeSingle()

  if (claimError || !claimed) return { state: 'processing', id: existing.id }
  return { state: 'claimed', id: claimed.id }
}

async function markProcessed(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { error } = await admin
    .from('subscription_events')
    .update({ status: 'processed', processed_at: new Date().toISOString(), error_message: null })
    .eq('id', id)
  if (error) throw error
}

async function markFailed(admin: ReturnType<typeof createAdminClient>, id: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'unknown_error'
  await admin
    .from('subscription_events')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      error_message: message.slice(0, 1000),
    })
    .eq('id', id)
}

async function syncSubscription(event: StripeEvent, override?: StripeSubscription) {
  const object = event.data.object as BillingEventObject
  const subscriptionId = String(object.id ?? override?.id ?? '')
  if (!subscriptionId) return null

  let subscription = override ?? (object as unknown as StripeSubscription)
  if (!subscription.items) {
    subscription = await stripeRequest<StripeSubscription>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    )
  }

  const metadata = subscription.metadata ?? meta(object)
  if (!metadata.user_id || !metadata.plan_id) return null

  const admin = createAdminClient()
  const { data: local, error } = await admin
    .from('subscriptions')
    .upsert(
      {
        user_id: metadata.user_id,
        plan_id: metadata.plan_id,
        status: statusOf(String(subscription.status)),
        billing_interval: subscription.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
        current_period_start: iso(subscription.current_period_start),
        current_period_end: iso(subscription.current_period_end),
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        cancelled_at: iso(subscription.canceled_at),
        provider: 'stripe',
        provider_customer_id: typeof subscription.customer === 'string' ? subscription.customer : null,
        provider_subscription_id: subscriptionId,
        metadata: { plan_code: metadata.plan_code ?? null, stripe_event_id: event.id },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider,provider_subscription_id' },
    )
    .select('id,user_id,plan_id')
    .maybeSingle()

  if (error) throw error
  if (!local) return null

  if (event.type === 'customer.subscription.deleted') {
    await admin
      .from('billing_transactions')
      .update({ status: 'cancelled', metadata: { stripe_event_id: event.id } })
      .eq('subscription_id', local.id)
      .eq('provider', 'stripe')
      .in('status', ['pending', 'failed'])
  }

  return local
}

async function orderEvent(event: StripeEvent) {
  const object = event.data.object as BillingEventObject
  const metadata = meta(object)
  const orderId = metadata.order_id
  if (!orderId) return false

  const admin = createAdminClient()
  const success =
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'

  if (success) {
    if (!object.id || !metadata.user_id || object.amount_total == null || !object.currency) {
      throw new Error('checkout_session_financial_fields_missing')
    }

    const { error } = await admin.rpc('process_stripe_checkout_session', {
      p_order_id: orderId,
      p_session_id: object.id,
      p_event_id: event.id,
      p_amount_total: object.amount_total,
      p_currency: object.currency,
      p_buyer_id: metadata.user_id,
    })
    if (error) throw new Error(error.message || 'stripe_checkout_processing_failed')
    return true
  }

  if (!object.id) return false

  const { error } = await admin.rpc('process_stripe_checkout_failure', {
    p_order_id: orderId,
    p_session_id: object.id,
  })
  if (error) throw new Error(error.message || 'stripe_checkout_failure_processing_failed')
  return true
}

async function checkoutEvent(event: StripeEvent, status: 'completed' | 'failed') {
  const object = event.data.object as BillingEventObject
  const metadata = meta(object)

  if (metadata.order_id) {
    await orderEvent(event)
    return
  }

  const checkoutId = String(object.id ?? '')
  if (!checkoutId || !metadata.user_id) return

  const admin = createAdminClient()
  const { error } = await admin
    .from('checkout_intents')
    .update({
      status,
      updated_at: new Date().toISOString(),
      metadata: {
        ...metadata,
        stripe_subscription_id: typeof object.subscription === 'string' ? object.subscription : null,
        stripe_customer_id: typeof object.customer === 'string' ? object.customer : null,
        stripe_event_id: event.id,
      },
    })
    .eq('provider', 'stripe')
    .eq('provider_checkout_id', checkoutId)

  if (error) throw error
}

async function invoiceEvent(event: StripeEvent) {
  const object = event.data.object as BillingEventObject
  const subscriptionId = typeof object.subscription === 'string' ? object.subscription : null
  if (!subscriptionId) return

  const subscription = await stripeRequest<StripeSubscription>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
  )
  const local = await syncSubscription(event, subscription)
  if (!local) return

  const admin = createAdminClient()
  const metadata = subscription.metadata ?? {}
  const paid = event.type === 'invoice.paid'
  const amount = Math.max(0, Number(object.amount_total ?? 0))
  const currency = String(object.currency ?? 'usd').toUpperCase()
  const invoiceId = typeof object.id === 'string' ? object.id : null
  if (!invoiceId || !Number.isSafeInteger(amount)) return

  const transaction = {
    user_id: local.user_id,
    subscription_id: local.id,
    type: 'subscription',
    status: paid ? 'paid' : 'failed',
    amount_minor: amount,
    currency,
    provider: 'stripe',
    provider_transaction_id: invoiceId,
    description: `Factura de suscripción Credi Marketplace ${metadata.plan_code ?? ''}`.trim(),
    metadata: {
      ...metadata,
      stripe_subscription_id: subscriptionId,
      stripe_event_id: event.id,
      stripe_invoice_id: invoiceId,
    },
    paid_at: paid ? new Date().toISOString() : null,
  }

  const { error } = await admin
    .from('billing_transactions')
    .upsert(transaction, { onConflict: 'provider,provider_transaction_id' })
  if (error) throw error

  if (paid) {
    const { error: revenueError } = await admin
      .from('platform_revenue')
      .insert({
        source_type: 'subscription',
        source_id: local.id,
        amount_minor: transaction.amount_minor,
        currency,
        status: 'recognized',
        description: transaction.description,
        metadata: transaction.metadata,
        recognized_at: new Date().toISOString(),
      })

    if (revenueError && revenueError.code !== '23505') throw revenueError
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
    if (!verifyStripeWebhookSignature(rawBody, signature ?? '')) {
      logger.warn('Invalid Stripe billing webhook signature', {
        requestId,
        action: 'stripe_billing_webhook_invalid_signature',
      })
      return jsonResponse({ success: false, error: 'Firma de webhook inválida.' }, 400, requestId)
    }

    let event: StripeEvent
    try {
      event = JSON.parse(rawBody) as StripeEvent
    } catch {
      return jsonResponse({ success: false, error: 'JSON de webhook inválido.' }, 400, requestId)
    }

    if (!event.id || !event.type || !event.data?.object) {
      return jsonResponse({ success: false, error: 'Evento Stripe incompleto.' }, 400, requestId)
    }

    const admin = createAdminClient()
    const claim = await claimEvent(admin, event)
    if (claim.state === 'duplicate') {
      return jsonResponse({ success: true, received: true, processed: true, duplicate: true }, 200, requestId)
    }
    if (claim.state === 'processing') {
      return jsonResponse({ success: true, received: true, processing: true, duplicate: true }, 200, requestId)
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
          await checkoutEvent(event, 'completed')
          break
        case 'checkout.session.async_payment_failed':
        case 'checkout.session.expired':
          await checkoutEvent(event, 'failed')
          break
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await syncSubscription(event)
          break
        case 'invoice.paid':
        case 'invoice.payment_failed':
          await invoiceEvent(event)
          break
        default:
          break
      }

      await markProcessed(admin, claim.id)
      return jsonResponse({ success: true, received: true, processed: true, eventType: event.type }, 200, requestId)
    } catch (error) {
      await markFailed(admin, claim.id, error)
      logger.error('Stripe billing webhook processing failed', {
        requestId,
        action: 'stripe_billing_webhook_processing_failed',
        metadata: error instanceof Error ? error.message : 'unknown_error',
      })
      return jsonResponse({ success: false, error: 'No fue posible procesar el evento de billing.' }, 500, requestId)
    }
  } catch (error) {
    logger.error('Stripe billing webhook handler error', {
      requestId,
      action: 'stripe_billing_webhook_error',
      metadata: error instanceof Error ? error.message : 'unknown_error',
    })
    return jsonResponse({ success: false, error: 'Webhook inválido.' }, 400, requestId)
  }
}
