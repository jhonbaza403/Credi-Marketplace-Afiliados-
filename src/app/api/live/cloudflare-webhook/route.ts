import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { syncLatestReplay } from '@/lib/cloudflare/stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function verify(body: string, header: string | null, secret: string) {
  if (!header) return false
  const values = Object.fromEntries(header.split(',').map((part) => {
    const [key, value] = part.split('=', 2)
    return [key, value]
  }))
  const timestamp = Number(values.time)
  const signature = values.sig1
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - timestamp) > 300) return false

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex')
  const expectedBytes = Buffer.from(expected, 'hex')
  const actualBytes = Buffer.from(signature, 'hex')
  return expectedBytes.length === actualBytes.length && crypto.timingSafeEqual(expectedBytes, actualBytes)
}

export async function POST(request: Request) {
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ success: false, error: 'Webhook no configurado.' }, { status: 503 })

  const body = await request.text()
  if (!verify(body, request.headers.get('Webhook-Signature'), secret)) {
    return NextResponse.json({ success: false, error: 'Firma inválida.' }, { status: 403 })
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
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ success: false, error: 'Payload inválido.' }, { status: 400 })
  }

  const inputId = payload.data?.input_id
  const eventType = payload.data?.event_type
  if (!inputId || !eventType) return NextResponse.json({ success: true, ignored: true })

  const supabase = await createClient()
  const { data: rooms } = await supabase
    .from('chat_live_rooms')
    .select('id,metadata,status,started_at')
    .contains('metadata', { cloudflare_live_input_id: inputId })
    .limit(1)
  const room = rooms?.[0]
  if (!room) return NextResponse.json({ success: true, ignored: true })

  const metadata = (room.metadata && typeof room.metadata === 'object' ? room.metadata : {}) as Record<string, unknown>
  const eventAt = payload.data?.updated_at || new Date().toISOString()
  const next: Record<string, unknown> = {
    ...metadata,
    cloudflare_last_event: eventType,
    cloudflare_last_event_at: eventAt,
  }
  const updates: Record<string, unknown> = { metadata: next }

  if (eventType === 'live_input.connected') {
    updates.status = 'live'
    updates.started_at = room.started_at || eventAt
    next.transport_state = 'connected'
    next.cloudflare_last_error = null
  } else if (eventType === 'live_input.disconnected') {
    updates.status = 'ended'
    updates.ended_at = eventAt
    next.transport_state = 'disconnected'
    next.cloudflare_replay_sync_state = 'pending'

    try {
      const replay = await syncLatestReplay(inputId, room.started_at || eventAt)
      next.cloudflare_replay_sync_state = replay.state
      next.cloudflare_replay_last_checked_at = new Date().toISOString()
      if (replay.videoId) next.cloudflare_replay_video_id = replay.videoId
      if (replay.state === 'ready') updates.replay_url = replay.playbackUrl
    } catch {
      next.cloudflare_replay_sync_state = 'retry_required'
    }
  } else if (eventType === 'live_input.errored') {
    next.transport_state = 'error'
    next.cloudflare_last_error = payload.data?.live_input_errored?.error || null
  }

  const { error } = await supabase.from('chat_live_rooms').update(updates).eq('id', room.id)
  if (error) return NextResponse.json({ success: false, error: 'No fue posible actualizar la sala.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
