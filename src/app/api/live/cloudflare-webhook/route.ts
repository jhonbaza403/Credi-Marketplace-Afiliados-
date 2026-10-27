import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listInputVideos } from '@/lib/cloudflare/stream'
import { verifyStreamLiveWebhookAuth } from '@/lib/cloudflare/stream-live-webhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ success: false, error: 'Webhook no configurado.' }, { status: 503 })
  }

  if (!verifyStreamLiveWebhookAuth(request.headers.get('cf-webhook-auth'), secret)) {
    return NextResponse.json({ success: false, error: 'Autenticación de webhook inválida.' }, { status: 403 })
  }

  const rawBody = await request.text()
  if (rawBody.length > 256_000) {
    return NextResponse.json({ success: false, error: 'Payload demasiado grande.' }, { status: 413 })
  }

  let payload: {
    data?: {
      input_id?: string
      event_type?: string
      updated_at?: string
      live_input_errored?: { error?: { code?: string; message?: string } }
    }
  }
  try {
    payload = JSON.parse(rawBody) as typeof payload
  } catch {
    return NextResponse.json({ success: false, error: 'Payload JSON inválido.' }, { status: 400 })
  }

  const inputId = payload.data?.input_id
  const eventType = payload.data?.event_type
  if (!inputId || !eventType || !['live_input.connected', 'live_input.disconnected', 'live_input.errored'].includes(eventType)) {
    return NextResponse.json({ success: true, ignored: true })
  }

  // This endpoint has already authenticated Cloudflare's webhook signature.
  // Use the server-only admin client so RLS for interactive users doesn't
  // prevent a verified provider event from updating the live room.
  const supabase = createAdminClient()
  const { data: rooms, error: lookupError } = await supabase
    .from('chat_live_rooms')
    .select('id,metadata,status')
    .contains('metadata', { cloudflare_live_input_id: inputId })
    .limit(1)
  if (lookupError) {
    return NextResponse.json({ success: false, error: 'No fue posible consultar la sala LIVE.' }, { status: 500 })
  }
  const room = rooms?.[0]
  if (!room) return NextResponse.json({ success: true, ignored: true })

  const metadata = (room.metadata && typeof room.metadata === 'object' ? room.metadata : {}) as Record<string, unknown>
  const next: Record<string, unknown> = {
    ...metadata,
    cloudflare_last_event: eventType,
    cloudflare_last_event_at: payload.data?.updated_at || new Date().toISOString(),
  }
  const updates: { metadata: Record<string, unknown>; status?: string; ended_at?: string; replay_url?: string } = {
    metadata: next,
  }

  if (eventType === 'live_input.connected') updates.status = 'live'
  if (eventType === 'live_input.disconnected') {
    updates.status = 'ended'
    updates.ended_at = payload.data?.updated_at || new Date().toISOString()
    try {
      const videos = await listInputVideos(inputId)
      const ready = videos.filter(video => video.readyToStream || video.status?.state === 'ready').at(0)
      if (ready) {
        updates.replay_url = `https://videodelivery.net/${ready.uid}/manifest/video.m3u8`
        next.cloudflare_replay_video_id = ready.uid
      }
    } catch {
      // Replay lookup is retried by the next synchronization.
    }
  }
  if (eventType === 'live_input.errored') {
    next.cloudflare_last_error = payload.data?.live_input_errored?.error || null
  }

  const { error } = await supabase.from('chat_live_rooms').update(updates).eq('id', room.id)
  if (error) {
    return NextResponse.json({ success: false, error: 'No fue posible actualizar la sala.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
