import { NextResponse } from 'next/server'

import { POST as checkoutPOST } from '@/app/api/checkout/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>

    const headers = new Headers(request.headers)
    headers.set('content-type', 'application/json')

    const forwardedBody = JSON.stringify({
      order_id: body.order_id,
      payment_method: body.provider ?? body.payment_method ?? 'stripe',
      region: body.region,
    })

    return checkoutPOST(new Request(request.url, {
      method: 'POST',
      headers,
      body: forwardedBody,
    }))
  } catch {
    return NextResponse.json(
      { success: false, error: 'Solicitud de pago inválida.', code: 'INVALID_PAYMENT_REQUEST' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
