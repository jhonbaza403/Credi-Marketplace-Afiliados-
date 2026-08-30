import { NextResponse } from 'next/server'

import {
  rateLimit,
} from '@/lib/security/rate-limit'

import {
  isSameOrigin,
} from '@/lib/security/csrf'

import {
  isUUID,
} from '@/lib/validation/common'

import {
  writeAuditEvent,
} from '@/lib/security/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
) {
  const requestId =
    crypto.randomUUID()

  try {
    const forwardedFor =
      request.headers.get(
        'x-forwarded-for',
      )

    const ip =
      forwardedFor
        ?.split(',')[0]
        ?.trim() ||
      'unknown'

    const limit =
      await rateLimit(
        `affiliate:${ip}`,
        {
          limit: 60,
          windowMs: 60_000,
        },
      )

    if (!limit.success) {
      await writeAuditEvent({
        action:
          'security.rate_limited',
        metadata: {
          endpoint:
            '/api/affiliate',
          requestId,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error:
            'Demasiadas solicitudes. Intenta nuevamente más tarde.',
          code: 'RATE_LIMITED',
        },
        {
          status: 429,
          headers: {
            'Cache-Control':
              'no-store',
            'Retry-After': String(
              Math.ceil(
                (limit.resetAt -
                  Date.now()) /
                  1000,
              ),
            ),
          },
        },
      )
    }

    if (!isSameOrigin(request)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Origen no autorizado.',
        },
        { status: 403 },
      )
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >

    const affiliateId =
      body.affiliate_id

    const productId =
      body.product_id

    if (
      !isUUID(affiliateId) &&
      typeof affiliateId !== 'string'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Referencia de afiliado inválida.',
        },
        { status: 400 },
      )
    }

    if (
      productId !== undefined &&
      !isUUID(productId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Producto afiliado inválido.',
        },
        { status: 400 },
      )
    }

    /*
     * No redireccionamos ni confiamos en una URL
     * enviada arbitrariamente por el navegador.
     *
     * La URL afiliada debe obtenerse del catálogo
     * autorizado en Supabase.
     */

    return NextResponse.json(
      {
        success: true,
        tracked: true,
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
      `[affiliate:${requestId}]`,
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'No fue posible registrar el evento afiliado.',
      },
      { status: 500 },
    )
  }
}
