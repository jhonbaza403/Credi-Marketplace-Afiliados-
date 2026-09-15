import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CODE_RE = /^[A-Za-z0-9_-]{3,96}$/
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const requestId = crypto.randomUUID()

  try {
    const { code } = await context.params
    if (!CODE_RE.test(code)) return errorResponse('Enlace de afiliado no válido.', 404)

    const admin = createAdminClient()
    const { data: link, error: linkError } = await admin
      .from('affiliate_product_links')
      .select('id, affiliate_id, product_id, is_active')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()

    if (linkError || !link) return errorResponse('Enlace de afiliado no válido o inactivo.', 404)

    const [{ data: affiliate, error: affiliateError }, { data: affiliateProduct, error: productError }] = await Promise.all([
      admin.from('affiliates').select('id, code, is_active').eq('id', link.affiliate_id).eq('is_active', true).maybeSingle(),
      admin.from('affiliate_products').select('affiliate_url, is_active').eq('affiliate_id', link.affiliate_id).eq('product_id', link.product_id).eq('is_active', true).maybeSingle(),
    ])

    if (affiliateError || !affiliate?.is_active || productError || !affiliateProduct?.is_active) {
      return errorResponse('El producto afiliado no está disponible.', 404)
    }

    let destination: URL
    try {
      destination = new URL(affiliateProduct.affiliate_url)
    } catch {
      return errorResponse('La URL afiliada registrada no es válida.', 422)
    }
    if (destination.protocol !== 'https:' || destination.username || destination.password || destination.href.length > 2048) {
      return errorResponse('La URL afiliada registrada no es segura.', 422)
    }

    const { error: clickError } = await admin.rpc('record_affiliate_product_click', { p_link_id: link.id })
    if (clickError) {
      console.error(`[affiliate-go:${requestId}] click`, clickError)
      return errorResponse('No fue posible registrar el clic.', 500)
    }

    const response = NextResponse.redirect(destination, 302)
    const secure = new URL(request.url).protocol === 'https:'
    const cookieOptions = `Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure ? '; Secure' : ''}; HttpOnly`
    response.headers.append('Set-Cookie', `credi_affiliate_ref=${encodeURIComponent(affiliate.code)}; ${cookieOptions}`)
    response.headers.append('Set-Cookie', `credi_affiliate_product_link=${encodeURIComponent(code)}; ${cookieOptions}`)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error(`[affiliate-go:${requestId}]`, error)
    return errorResponse('No fue posible procesar el enlace afiliado.', 500)
  }
}
