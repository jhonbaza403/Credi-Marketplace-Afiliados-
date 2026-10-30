import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const mediaSchema = z.object({
  type: z.enum(['image', 'video', 'audio']),
  url: z.string().url().max(2048),
})

const baseSchema = z.object({
  type: z.enum(['post', 'story', 'reel', 'ad']),
  title: z.string().trim().max(180).default(''),
  body: z.string().trim().max(5000).default(''),
  media: z.array(mediaSchema).max(10).default([]),
  visibility: z.enum(['public', 'private']).default('public'),
  destinationUrl: z.string().trim().max(2048).optional().nullable(),
  budget: z.number().finite().min(0).max(100_000_000).optional().nullable(),
  disclosure: z.boolean().optional().default(false),
  operationContext: z.object({
    productId: z.string().uuid().optional().nullable(),
    catalogId: z.string().uuid().optional().nullable(),
    affiliateRef: z.string().trim().max(128).optional().nullable(),
    conversationId: z.string().uuid().optional().nullable(),
    orderId: z.string().uuid().optional().nullable(),
    source: z.string().trim().max(32).optional().nullable(),
  }).optional().default({}),
})

function jsonError(error: string, status: number, code: string, requestId?: string) {
  return NextResponse.json(
    { success: false, error, code, ...(requestId ? { requestId } : {}) },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  try {
    if (!isSameOrigin(request)) return jsonError('Origen no autorizado.', 403, 'CSRF_VALIDATION_FAILED', requestId)

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonError('La solicitud debe utilizar Content-Type: application/json.', 415, 'UNSUPPORTED_MEDIA_TYPE', requestId)
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[social:' + requestId + '] auth verification failed', authError.message)
      return jsonError('No fue posible verificar la sesión.', 401, 'AUTHENTICATION_ERROR', requestId)
    }
    if (!user) return jsonError('Debes iniciar sesión para publicar contenido.', 401, 'UNAUTHENTICATED', requestId)

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return jsonError('El cuerpo de la solicitud no contiene JSON válido.', 400, 'INVALID_JSON', requestId)
    }

    const parsed = baseSchema.safeParse(rawBody)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }))

      return NextResponse.json(
        {
          success: false,
          error: 'Los datos de publicación no son válidos.',
          code: 'INVALID_SOCIAL_DATA',
          requestId,
          details: issues,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const payload = parsed.data
    const operationContext = {
      product_id: payload.operationContext.productId || null,
      catalog_id: payload.operationContext.catalogId || null,
      affiliate_ref: payload.operationContext.affiliateRef?.trim() || null,
      conversation_id: payload.operationContext.conversationId || null,
      order_id: payload.operationContext.orderId || null,
      source: payload.operationContext.source || 'publish',
    }

    if (operationContext.product_id) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id,is_active')
        .eq('id', operationContext.product_id)
        .maybeSingle()
      if (productError) throw productError
      if (!product?.is_active) return jsonError('El producto asociado ya no está disponible.', 409, 'PRODUCT_CONTEXT_NOT_AVAILABLE', requestId)
    }

    if (operationContext.catalog_id) {
      const { data: catalog, error: catalogError } = await supabase
        .from('business_catalogs')
        .select('id')
        .eq('id', operationContext.catalog_id)
        .eq('owner_id', user.id)
        .maybeSingle()
      if (catalogError) throw catalogError
      if (!catalog) return jsonError('El catálogo asociado no existe o no pertenece a tu cuenta.', 403, 'CATALOG_CONTEXT_FORBIDDEN', requestId)
    }

    const title = payload.title.trim()
    const body = payload.body.trim()
    const hasMedia = payload.media.length > 0
    const hasText = body.length > 0

    if (payload.type === 'post' && !hasText && !hasMedia) {
      return jsonError('Escribe algo o añade una imagen o un vídeo para publicar.', 400, 'POST_CONTENT_REQUIRED', requestId)
    }
    if (payload.type === 'story' && !hasText && !hasMedia) {
      return jsonError('Una historia necesita texto, una imagen o un vídeo.', 400, 'STORY_CONTENT_REQUIRED', requestId)
    }
    if (payload.type === 'reel' && !payload.media.some((item) => item.type === 'video')) {
      return jsonError('Un reel necesita al menos un vídeo.', 400, 'REEL_VIDEO_REQUIRED', requestId)
    }
    if (payload.type === 'ad' && !title) {
      return jsonError('Añade un título para identificar tu campaña.', 400, 'TITLE_REQUIRED', requestId)
    }
    if (payload.type === 'ad' && !payload.media.some((item) => item.type === 'image' || item.type === 'video')) {
      return jsonError('Añade una imagen o un vídeo para crear la campaña.', 400, 'AD_MEDIA_REQUIRED', requestId)
    }

    const disclosureRequired = payload.type === 'ad' || Boolean(operationContext.affiliate_ref)
    if (disclosureRequired && !payload.disclosure) {
      return jsonError('Confirma la declaración de publicidad o afiliación antes de continuar.', 400, 'DISCLOSURE_REQUIRED', requestId)
    }

    let destinationUrl: string | null = null
    if (payload.type === 'ad' && payload.destinationUrl?.trim()) {
      try {
        const url = new URL(payload.destinationUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol')
        destinationUrl = url.toString()
      } catch {
        return jsonError('La URL de destino debe ser HTTP o HTTPS.', 400, 'INVALID_DESTINATION_URL', requestId)
      }
    }

    const now = new Date().toISOString()
    let id: string | null = null
    const affiliateDisclosure = Boolean(operationContext.affiliate_ref && payload.disclosure)

    if (payload.type === 'post') {
      const { data, error } = await supabase.from('feed_posts').insert({
        owner_id: user.id,
        title,
        body,
        media: payload.media,
        visibility: payload.visibility,
        status: 'draft',
        published_at: null,
        is_sponsored: false,
        affiliate_disclosure: affiliateDisclosure,
        moderation_status: 'pending',
        operation_context: operationContext,
      }).select('id').single()
      if (error) throw error
      id = data.id
    } else if (payload.type === 'story') {
      const { data, error } = await supabase.from('stories').insert({
        owner_id: user.id,
        body,
        media: payload.media,
        product_id: operationContext.product_id,
        catalog_id: operationContext.catalog_id,
        operation_context: operationContext,
        visibility: payload.visibility,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_sponsored: false,
        affiliate_disclosure: affiliateDisclosure,
        moderation_status: 'pending',
      }).select('id').single()
      if (error) throw error
      id = data.id
    } else if (payload.type === 'reel') {
      const { data, error } = await supabase.from('reels').insert({
        owner_id: user.id,
        title,
        body,
        media: payload.media,
        visibility: payload.visibility,
        status: 'draft',
        published_at: null,
        is_sponsored: false,
        affiliate_disclosure: affiliateDisclosure,
        moderation_status: 'pending',
      }).select('id').single()
      if (error) throw error
      id = data.id
    } else {
      const { data, error } = await supabase.from('advertisements').insert({
        owner_id: user.id,
        title,
        body,
        media: payload.media,
        destination_url: destinationUrl,
        status: 'draft',
        moderation_status: 'pending',
        budget_amount: payload.budget ?? null,
        starts_at: null,
        operation_context: operationContext,
      }).select('id').single()
      if (error) throw error
      id = data.id
    }

    return NextResponse.json(
      {
        success: true,
        id,
        status: 'draft',
        moderationStatus: 'pending',
        createdAt: now,
        requestId,
        message: payload.type === 'ad'
          ? 'Campaña recibida y pendiente de revisión; todavía no está activa.'
          : payload.type === 'story'
            ? 'Historia recibida y pendiente de revisión. Su duración de 24 horas empieza tras la aprobación.'
            : 'Contenido recibido y pendiente de revisión antes de aparecer en el Muro.',
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown'
    console.error('[social:' + requestId + '] publish persistence failed', message)
    return jsonError('No fue posible registrar el contenido. Código de soporte: ' + requestId, 500, 'SOCIAL_PUBLISH_FAILED', requestId)
  }
}
