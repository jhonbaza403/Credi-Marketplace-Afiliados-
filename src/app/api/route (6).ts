import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import {
  validatePaymentInput,
} from '@/lib/payments/validate-payment'

import {
  isSameOrigin,
} from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
) {
  const requestId =
    crypto.randomUUID()

  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Origen no autorizado.',
          code: 'CSRF_VALIDATION_FAILED',
        },
        { status: 403 },
      )
    }

    const supabase =
      await createClient()

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Debes iniciar sesión.',
        },
        { status: 401 },
      )
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >

    const validation =
      validatePaymentInput({
        orderId: body.order_id,
        provider: body.provider,
        /*
         * El amount recibido aquí se utilizará
         * únicamente como dato auxiliar.
         *
         * La RPC debe comparar el importe contra
         * la orden almacenada.
         */
        amount: body.amount,
        currency: body.currency,
      })

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          code: 'INVALID_PAYMENT',
        },
        { status: 400 },
      )
    }

    /*
     * Obtener la orden REAL.
     */
    const {
      data: order,
      error: orderError,
    } = await supabase
      .from('orders')
      .select(
        'id, customer_id, total_amount, status',
      )
      .eq(
        'id',
        validation.orderId,
      )
      .maybeSingle()

    if (orderError) {
      console.error(
        `[payments:${requestId}]`,
        orderError,
      )

      return NextResponse.json(
        {
          success: false,
          error:
            'No fue posible verificar la orden.',
        },
        { status: 500 },
      )
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Orden no encontrada.',
        },
        { status: 404 },
      )
    }

    if (
      order.customer_id !== user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No tienes autorización sobre esta orden.',
        },
        { status: 403 },
      )
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error:
            'La orden no puede recibir un nuevo pago.',
        },
        { status: 409 },
      )
    }

    /*
     * El precio real es el de la orden.
     */
    const orderAmount =
      Number(order.total_amount)

    if (
      !Number.isFinite(orderAmount) ||
      orderAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'La orden tiene un importe inválido.',
        },
        { status: 500 },
      )
    }

    /*
     * El siguiente paso será crear el intento de pago
     * mediante una RPC idempotente:
     *
     * create_payment_intent(...)
     *
     * y posteriormente llamar al proveedor.
     */

    return NextResponse.json(
      {
        success: true,
        status: 'pending',
        orderId: order.id,
        amount: orderAmount,
        currency:
          validation.currency,
        provider:
          validation.provider,
        message:
          'Orden validada. El proveedor de pago debe procesar la transacción.',
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store',
        },
      },
    )
  } catch (error) {
    console.error(
      `[payments:${requestId}]`,
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'No fue posible iniciar el pago.',
        code: 'PAYMENT_INITIALIZATION_FAILED',
      },
      { status: 500 },
    )
  }
}
