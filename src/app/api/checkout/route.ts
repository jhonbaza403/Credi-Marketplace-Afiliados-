import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/checkout
 *
 * Inicializa el proceso de checkout para una orden previamente creada.
 *
 * ARQUITECTURA:
 *
 *   Client
 *      ↓
 *   POST /api/orders
 *      ↓
 *   PostgreSQL RPC
 *      ↓
 *   order = pending
 *      ↓
 *   POST /api/checkout
 *      ↓
 *   Payment Provider
 *      ↓
 *   Webhook
 *      ↓
 *   order = paid/completed
 *
 * SEGURIDAD:
 *
 * - La identidad se obtiene desde Supabase Auth.
 * - Nunca se acepta customerId desde el navegador.
 * - Nunca se acepta price desde el navegador.
 * - Nunca se acepta totalAmount desde el navegador.
 * - Nunca se acepta sellerId desde el navegador.
 * - Nunca se marca una orden como completed aquí.
 * - El estado definitivo del pago debe establecerse mediante webhook.
 * - La orden debe pertenecer al usuario autenticado.
 * - Solo se permiten órdenes en estado pending.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CheckoutRequestBody = {
  order_id?: unknown
  payment_method?: unknown
  region?: unknown
}

const ALLOWED_PAYMENT_METHODS = new Set([
  'stripe',
  'binance_pay',
  'usdt',
  'paypal',
])

const MAX_BODY_SIZE = 16_384

function jsonError(
  message: string,
  status: number,
  code?: string,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(code ? { code } : {}),
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function normalizePaymentMethod(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return null
  }

  return ALLOWED_PAYMENT_METHODS.has(normalized) ? normalized : null
}

function normalizeRegion(value: unknown): string {
  if (typeof value !== 'string') {
    return 'GLOBAL'
  }

  const normalized = value.trim().toUpperCase()

  if (!normalized) {
    return 'GLOBAL'
  }

  if (normalized.length > 32) {
    return 'GLOBAL'
  }

  return normalized
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  try {
    const contentType = request.headers.get('content-type') ?? ''

    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonError(
        'La solicitud debe utilizar Content-Type: application/json.',
        415,
        'UNSUPPORTED_MEDIA_TYPE',
      )
    }

    const contentLength = request.headers.get('content-length')

    if (
      contentLength &&
      Number.isFinite(Number(contentLength)) &&
      Number(contentLength) > MAX_BODY_SIZE
    ) {
      return jsonError(
        'La solicitud es demasiado grande.',
        413,
        'PAYLOAD_TOO_LARGE',
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error(
        `[checkout:${requestId}] Authentication error`,
        authError,
      )

      return jsonError(
        'No fue posible verificar la sesión.',
        401,
        'AUTHENTICATION_ERROR',
      )
    }

    if (!user) {
      return jsonError(
        'Debes iniciar sesión para continuar con el checkout.',
        401,
        'UNAUTHENTICATED',
      )
    }

    let body: CheckoutRequestBody

    try {
      body = await request.json()
    } catch {
      return jsonError(
        'El cuerpo de la solicitud no contiene JSON válido.',
        400,
        'INVALID_JSON',
      )
    }

    const orderId =
      typeof body.order_id === 'string' ? body.order_id.trim() : ''

    if (!orderId || !isValidUUID(orderId)) {
      return jsonError(
        'El identificador de la orden no es válido.',
        400,
        'INVALID_ORDER_ID',
      )
    }

    const paymentMethod = normalizePaymentMethod(body.payment_method)

    if (!paymentMethod) {
      return jsonError(
        'El método de pago seleccionado no está disponible.',
        400,
        'INVALID_PAYMENT_METHOD',
      )
    }

    const region = normalizeRegion(body.region)

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from('orders')
      .select('id, buyer_id, total_amount, status, currency')
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .maybeSingle()

    if (orderError) {
      console.error(
        `[checkout:${requestId}] Order lookup error`,
        orderError,
      )

      return jsonError(
        'No fue posible verificar la orden.',
        500,
        'ORDER_LOOKUP_FAILED',
      )
    }

    if (!order) {
      return jsonError(
        'La orden no existe o no pertenece al usuario autenticado.',
        404,
        'ORDER_NOT_FOUND',
      )
    }

    if (order.status === 'paid' || order.status === 'completed') {
      return jsonError(
        'Esta orden ya fue pagada.',
        409,
        'ORDER_ALREADY_PAID',
      )
    }

    if (order.status !== 'pending') {
      return jsonError(
        'La orden no se encuentra disponible para iniciar el pago.',
        409,
        'ORDER_NOT_PAYABLE',
      )
    }

    const totalAmount = Number(order.total_amount)

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      console.error(`[checkout:${requestId}] Invalid order total`, {
        orderId: order.id,
        totalAmount: order.total_amount,
      })

      return jsonError(
        'La orden contiene un importe inválido.',
        500,
        'INVALID_ORDER_TOTAL',
      )
    }

    const currency =
      typeof order.currency === 'string' && order.currency.trim()
        ? order.currency.trim().toUpperCase()
        : 'USD'

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          status: 'pending',
          amount: totalAmount,
          currency,
        },
        checkout: {
          provider: paymentMethod,
          region,
          ready: false,
          message:
            'La orden está validada y preparada para iniciar el proceso de pago.',
        },
        payment: null,
        message:
          'Checkout preparado correctamente. El pago debe confirmarse mediante el proveedor y su webhook.',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error: unknown) {
    console.error(
      `[checkout:${requestId}] Unexpected error`,
      error,
    )

    return jsonError(
      'Ocurrió un error inesperado al preparar el checkout.',
      500,
      'INTERNAL_SERVER_ERROR',
    )
  }
}
