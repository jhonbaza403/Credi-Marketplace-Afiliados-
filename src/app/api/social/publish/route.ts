import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const mediaSchema = z.object({
  type: z.enum(['image', 'video']),
  url: z.string().url().max(2048),
})

const baseSchema = z.object({
  type: z.enum(['post', 'story', 'reel', 'ad']),
  title: z.string().trim().max(180).default(''),
  body: z.string().trim().max(5000).default(''),
  media: z.array(mediaSchema).min(1).max(8),
  visibility: z.enum(['public', 'private']).default('public'),
  destinationUrl: z.string().trim().max(2048).optional().nullable(),
  budget: z.number().finite().min(0).max(100_000_000).optional().nullable(),
  disclosure: z.literal(true),
})

function jsonError(error: string, status: number, code: string) {
  return NextResponse.json(
    { success: false, error, code },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  try {
    if (!isSameOrigin(request)) return jsonError('Origen no autorizado.', 403, 'CSRF_VALIDATION_FAILED')

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonError('La solicitud debe utilizar Content-Type: application/json.', 415, 'UNSUPPORTED_MEDIA_TYPE')
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error(`[social:${requestId}] auth`, authError)
      return jsonError('No fue posible verificar la sesión.', 401, 'AUTHENTICATION_ERROR')
    }
    if (!user) return jsonError('Debes iniciar sesión para publicar contenido.', 401, 'UNAUTHENTICATED')

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return jsonError('El cuerpo de la solicitud no contiene JSON válido.', 400, 'INVALID_JSON')
    }

    const parsed = baseSchema.safeParse(rawBody)
    if (!parsed.success) return jsonError('Los datos de publicación no son válidos.', 400, 'INVALID_SOCIAL_DATA')

    const payload = parsed.data
    const title = payload.title.trim()
    const body = payload.body.trim()

    if (payload.type !== 'story' && title.length < 1) return jsonError('Añade un título antes de publicar.', 400, 'TITLE_REQUIRED')
    if (payload.type !== 'ad' && body.length < 1) return jsonError('Escribe el contenido antes de publicar.', 400, 'BODY_REQUIRED')
    if (payload.type === 'reel' && !payload.media.some((item) => item.type === 'video')) {
      return jsonError('Un reel necesita al menos un vídeo.', 400, 'REEL_VIDEO_REQUIRED')
    }

    let destinationUrl: string | null = null
    if (payload.type === 'ad' && payload.destinationUrl?.trim()) {
      try {
        const url = new URL(payload.destinationUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol')
        destinationUrl = url.toString()
      } catch {
        return jsonError('La URL de destino debe ser HTTP o HTTPS.', 400, 'INVALID_DESTINATION_URL')
      }
    }

    const now = new Date().toISOString()
    let id: string | null = null

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
        affiliate_disclosure: false,
        moderation_status: 'pending',
      }).select('id').single()
      if (error) throw error
      id = data.id
    } else if (payload.type === 'story') {
      const { data, error } = await supabase.from('stories').insert({
        owner_id: user.id,
        body,
        media: payload.media,
        visibility: payload.visibility,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_sponsored: false,
        affiliate_disclosure: false,
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
        affiliate_disclosure: false,
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
      }).select('id').single()
      if (error) throw error
      id = data.id
    }

    return NextResponse.json(
      {
        success: true,
        id,
        status: payload.type === 'ad' ? 'draft' : 'draft',
        moderationStatus: 'pending',
        createdAt: now,
        message: payload.type === 'ad'
          ? 'Campaña enviada a revisión.'
          : 'Contenido enviado a revisión antes de publicarse.',
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error: unknown) {
    console.error(`[social:${requestId}] publish error`, error)
    return jsonError('No fue posible registrar el contenido.', 500, 'SOCIAL_PUBLISH_FAILED')
  }
}
