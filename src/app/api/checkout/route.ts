import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { PAYMENT_PROVIDERS } from '@/lib/payments/constants'
import type { PaymentProvider } from '@/lib/payments/types'
import { createStripeCheckoutSession } from '@/lib/payments/stripe'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_SIZE = 16_384

type CheckoutRequestBody = {
  order_id?: unknown
  payment_method?: unknown
  region?: unknown
}

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json(
    { success: false, error: message, code },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizePaymentMethod(value: unknown): PaymentProvider | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase() as PaymentProvider
  return PAYMENT_PROVIDERS.includes(normalized) ? normalized : null
}

function normalizeRegion(value: unknown): string {
  if (typeof value !== 'string') return 'GLOBAL'
  const normalized = value.trim().toUpperCase()
  return normalized && normalized.length <= 32 ? normalized : 'GLOBAL'
}

function moneyToMinorUnits(value: number): number {
  return Math.round(value * 100)
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  try {
    if (!isSameOrigin(request)) return jsonError('Origen no autorizado.', 403, 'CSRF_VALIDATION_FAILED')

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonError('La solicitud debe utilizar Content-Type: application/json.', 415, 'UNSUPPORTED_MEDIA_TYPE')
    }

    const contentLength = request.headers.get('content-length')
    if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_BODY_SIZE) {
      return jsonError('La solicitud es demasiado grande.', 413, 'PAYLOAD_TOO_LARGE')
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error(`[checkout:${requestId}] Authentication error`, authError)
      return jsonError('No fue posible verificar la sesión.', 401, 'AUTHENTICATION_ERROR')
    }
    if (!user) return jsonError('Debes iniciar sesión para continuar con el checkout.', 401, 'UNAUTHENTICATED')

    let body: CheckoutRequestBody
    try {
      body = await request.json()
    } catch {
      return jsonError('El cuerpo de la solicitud no contiene JSON válido.', 400, 'INVALID_JSON')
    }

    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : ''
    if (!orderId || !isValidUUID(orderId)) return jsonError('El identificador de la orden no es válido.', 400, 'INVALID_ORDER_ID')

    const paymentMethod = normalizePaymentMethod(body.payment_method)
    if (!paymentMethod) return jsonError('El método de pago seleccionado no está disponible.', 400, 'INVALID_PAYMENT_METHOD')
    if (paymentMethod !== 'stripe') {
      return jsonError('Este proveedor todavía no está conectado al checkout automático.', 501, 'PAYMENT_PROVIDER_NOT_IMPLEMENTED')
    }

    const region = normalizeRegion(body.region)
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() || `checkout_${orderId}_${user.id}`
    if (idempotencyKey.length < 16 || idempotencyKey.length > 255) {
      return jsonError('La clave de idempotencia no es válida.', 400, 'INVALID_IDEMPOTENCY_KEY')
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyer_id, total_amount, status, currency, platform_commission, seller_amount, affiliate_commission')
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .maybeSingle()

    if (orderError) {
      console.error(`[checkout:${requestId}] Order lookup error`, orderError)
      return jsonError('No fue posible verificar la orden.', 500, 'ORDER_LOOKUP_FAILED')
    }
    if (!order) return jsonError('La orden no existe o no pertenece al usuario autenticado.', 404, 'ORDER_NOT_FOUND')
    if (order.status === 'paid' || order.status === 'completed') return jsonError('Esta orden ya fue pagada.', 409, 'ORDER_ALREADY_PAID')
    if (order.status !== 'pending') return jsonError('La orden no se encuentra disponible para iniciar el pago.', 409, 'ORDER_NOT_PAYABLE')

    const amount = Number(order.total_amount)
    const amountMinor = moneyToMinorUnits(amount)
    if (!Number.isFinite(amount) || amount <= 0 || amountMinor <= 0) {
      console.error(`[checkout:${requestId}] Invalid order total`, { orderId, amount: order.total_amount })
      return jsonError('La orden contiene un importe inválido.', 500, 'INVALID_ORDER_TOTAL')
    }

    const currency = typeof order.currency === 'string' && order.currency.trim()
      ? order.currency.trim().toUpperCase()
      : 'USD'
    if (currency !== 'USD') return jsonError('Stripe checkout está habilitado actualmente para órdenes en USD.', 422, 'STRIPE_CURRENCY_NOT_SUPPORTED')

    const { data: existing } = await supabase
      .from('payment_orchestrations')
      .select('id, status, provider_reference, metadata, amount, currency')
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .eq('method_type', 'stripe')
      .in('status', ['created', 'pending', 'requires_action'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.provider_reference) {
      const metadata = existing.metadata && typeof existing.metadata === 'object'
        ? existing.metadata as Record<string, unknown>
        : {}
      const checkoutUrl = typeof metadata.checkout_url === 'string' ? metadata.checkout_url : null
      if (checkoutUrl) {
        return NextResponse.json({
          success: true,
          order: { id: order.id, status: order.status, amount, currency },
          checkout: { provider: 'stripe', region, ready: true, url: checkoutUrl, session_id: existing.provider_reference },
          payment: { id: existing.id, status: existing.status, provider: 'stripe' },
        }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
      }
    }

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_title, quantity, unit_price, subtotal')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (itemsError) {
      console.error(`[checkout:${requestId}] Order items lookup error`, itemsError)
      return jsonError('No fue posible preparar los productos de la orden.', 500, 'ORDER_ITEMS_LOOKUP_FAILED')
    }
    if (!orderItems?.length) return jsonError('La orden no contiene productos para cobrar.', 422, 'ORDER_HAS_NO_ITEMS')

    const itemTotal = orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
    if (!Number.isFinite(itemTotal) || moneyToMinorUnits(itemTotal) !== amountMinor) {
      return jsonError('El total de la orden no coincide con sus productos. La orden debe recalcularse antes del pago.', 409, 'ORDER_TOTAL_MISMATCH')
    }

    const { data: orchestration, error: orchestrationError } = await supabase
      .from('payment_orchestrations')
      .insert({
        user_id: user.id,
        order_id: orderId,
        amount,
        currency,
        method_type: 'stripe',
        provider: 'stripe',
        status: 'created',
        client_reference: orderId,
        idempotency_key: idempotencyKey,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        metadata: { request_id: requestId, region },
      })
      .select('id')
      .single()

    if (orchestrationError || !orchestration) {
      if (orchestrationError?.code === '23505') {
        const { data: retryExisting } = await supabase
          .from('payment_orchestrations')
          .select('id, status, provider_reference, metadata')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle()
        const metadata = retryExisting?.metadata && typeof retryExisting.metadata === 'object'
          ? retryExisting.metadata as Record<string, unknown>
          : {}
        const checkoutUrl = typeof metadata.checkout_url === 'string' ? metadata.checkout_url : null
        if (retryExisting && checkoutUrl) {
          return NextResponse.json({ success: true, order: { id: order.id, status: order.status, amount, currency }, checkout: { provider: 'stripe', region, ready: true, url: checkoutUrl, session_id: retryExisting.provider_reference }, payment: { id: retryExisting.id, status: retryExisting.status, provider: 'stripe' } }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
        }
      }
      console.error(`[checkout:${requestId}] Payment orchestration insert error`, orchestrationError)
      return jsonError('No fue posible crear el intento de pago.', 500, 'PAYMENT_ORCHESTRATION_FAILED')
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '')
    const session = await createStripeCheckoutSession({
      orderId,
      userId: user.id,
      customerEmail: user.email,
      currency,
      amountMinor,
      lineItems: orderItems.map((item) => ({
        name: String(item.product_title || 'Producto Credi Marketplace'),
        quantity: Number(item.quantity),
        unitAmountMinor: moneyToMinorUnits(Number(item.unit_price)),
      })),
      successUrl: `${siteUrl}/checkout/success?order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/checkout/payment?order_id=${encodeURIComponent(orderId)}&payment_cancelled=1`,
      idempotencyKey,
    })

    const metadata = { request_id: requestId, region, checkout_url: session.url }
    const { error: updateError } = await supabase
      .from('payment_orchestrations')
      .update({ status: 'pending', provider_reference: session.id, metadata })
      .eq('id', orchestration.id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error(`[checkout:${requestId}] Payment orchestration update error`, updateError)
      return jsonError('El pago fue preparado por el proveedor pero no pudo registrarse localmente.', 500, 'PAYMENT_RECORD_UPDATE_FAILED')
    }

    return NextResponse.json({
      success: true,
      order: { id: order.id, status: order.status, amount, currency },
      checkout: { provider: 'stripe', region, ready: true, url: session.url, session_id: session.id },
      payment: { id: orchestration.id, status: 'pending', provider: 'stripe' },
      message: 'Checkout Stripe creado. La orden se marcará como pagada únicamente después de verificar el webhook de Stripe.',
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: unknown) {
    console.error(`[checkout:${requestId}] Unexpected error`, error)
    return jsonError('Ocurrió un error inesperado al preparar el checkout.', 500, 'INTERNAL_SERVER_ERROR')
  }
}
