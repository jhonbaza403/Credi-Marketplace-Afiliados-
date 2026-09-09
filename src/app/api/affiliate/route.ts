import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { isSameOrigin } from '@/lib/security/csrf'
import { isUUID } from '@/lib/validation/common'
import { writeAuditEvent } from '@/lib/security/audit'
import { getDatabaseServerClient } from '@/lib/database/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  })
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  try {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown'
    const limit = await rateLimit(`affiliate:${ip}`, { limit: 60, windowMs: 60_000 })

    if (!limit.success) {
      await writeAuditEvent({ action: 'security.rate_limited', metadata: { endpoint: '/api/affiliate', requestId } })
      return json(
        { success: false, error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.', code: 'RATE_LIMITED' },
        429,
        { 'Retry-After': String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) },
      )
    }

    if (!isSameOrigin(request)) {
      return json({ success: false, error: 'Origen no autorizado.' }, 403)
    }

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return json({ success: false, error: 'Content-Type debe ser application/json.' }, 415)
    }

    const body = await request.json() as Record<string, unknown>
    const affiliateId = typeof body.affiliate_id === 'string' ? body.affiliate_id : undefined
    const productId = typeof body.product_id === 'string' ? body.product_id : undefined
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const productLinkCode = typeof body.product_link_code === 'string' ? body.product_link_code.trim() : ''

    if (affiliateId && !isUUID(affiliateId)) return json({ success: false, error: 'Referencia de afiliado inválida.' }, 400)
    if (productId && !isUUID(productId)) return json({ success: false, error: 'Producto afiliado inválido.' }, 400)
    if (!affiliateId && !code && !productLinkCode) return json({ success: false, error: 'Falta la referencia de afiliado.' }, 400)

    const supabase = await getDatabaseServerClient()

    let resolvedAffiliateId = affiliateId ?? ''
    let resolvedProductId = productId ?? ''

    if (!resolvedAffiliateId) {
      if (productLinkCode) {
        const { data: link, error: linkError } = await supabase
          .from('affiliate_product_links')
          .select('affiliate_id, product_id, is_active')
          .eq('code', productLinkCode)
          .maybeSingle()
        if (linkError || !link?.is_active) return json({ success: false, error: 'Enlace de afiliado no válido.' }, 404)
        resolvedAffiliateId = link.affiliate_id
        resolvedProductId = resolvedProductId || link.product_id
      } else {
        const { data: affiliate, error: affiliateError } = await supabase
          .from('affiliates')
          .select('id, is_active')
          .eq('code', code)
          .maybeSingle()
        if (affiliateError || !affiliate?.is_active) return json({ success: false, error: 'Código de afiliado no válido.' }, 404)
        resolvedAffiliateId = affiliate.id
      }
    }

    if (resolvedProductId) {
      const { data: link, error: linkError } = await supabase
        .from('affiliate_product_links')
        .select('id, affiliate_id, product_id, is_active')
        .eq('affiliate_id', resolvedAffiliateId)
        .eq('product_id', resolvedProductId)
        .eq('is_active', true)
        .maybeSingle()

      if (linkError || !link) return json({ success: false, error: 'Producto de afiliado no está activo.' }, 404)

      const { error: clickError } = await supabase.rpc('record_affiliate_product_click', { p_link_id: link.id })
      if (clickError) {
        console.error(`[affiliate:${requestId}] click`, clickError)
        return json({ success: false, error: 'No fue posible registrar el clic.' }, 500)
      }
    }

    return json({ success: true, tracked: true, affiliateId: resolvedAffiliateId, productId: resolvedProductId || null })
  } catch (error) {
    console.error(`[affiliate:${requestId}]`, error)
    return json({ success: false, error: 'No fue posible registrar el evento afiliado.' }, 500)
  }
}
