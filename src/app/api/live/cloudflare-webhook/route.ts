import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncLatestReplay } from '@/lib/cloudflare/stream'
import { parseCloudflareLiveWebhook, verifyCloudflareWebhookSignature } from '@/lib/cloudflare/webhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RecordedEvent = {
  type: 'live_input.connected' | 'live_input.disconnected' | 'live_input.errored'
  inputId: string
  occurredAt: string
}

export async function POST(request: Request) {
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ success: false, error: 'Webhook no configurado.' }, { status: 503 })

  const body = await request.text()
  if (!verifyCloudflareWebhookSignature(body, request.headers, secret)) {
    return NextResponse.json({ success: false, error: 'Firma inválida.' }, { status: 403 })
  }

  const event = parseCloudflareLiveWebhook(body)
  if (!event) return NextResponse.json({ success: true, ignored: true, reason: 'unsupported_or_invalid_payload' })

  const supabase = createAdminClient()
  const { data: rooms, error: lookupError } = await supabase
    .from('chat_live_rooms')
    .select('id,metadata,status,started_at')
    .contains('metadata', { cloudflare_live_input_id: event.inputId })
    .limit(1)

  if (lookupError) return NextResponse.json({ success: false, error: 'No fue posible localizar la sala LIVE.' }, { status: 500 })
  const room = rooms?.[0]
  if (!room) return NextResponse.json({ success: true, ignored: true, reason: 'input_not_linked' })

  const metadata = (room.metadata && typeof room.metadata === 'object' ? room.metadata : {}) as Record<string, unknown>
  const previousState = typeof metadata.transport_state === 'string' ? metadata.transport_state : 'unknown'
  const history = Array.isArray(metadata.cloudflare_event_history)
    ? metadata.cloudflare_event_history as RecordedEvent[]
    : []

  const duplicate = history.some((item) =>
    item.type === event.eventType && item.inputId === event.inputId && item.occurredAt === event.occurredAt,
  )
  if (duplicate) return NextResponse.json({ success: true, duplicate: true })

  const eventRecord: RecordedEvent = {
    type: event.eventType,
    inputId: event.inputId,
    occurredAt: event.occurredAt,
  }
  const next: Record<string, unknown> = {
    ...metadata,
    cloudflare_last_event: event.eventType,
    cloudflare_last_event_at: event.occurredAt,
    cloudflare_event_history: [...history, eventRecord].slice(-40),
  }
  const updates: Record<string, unknown> = { metadata: next }

  if (event.eventType === 'live_input.connected') {
    const isReconnect = ['disconnected', 'error', 'recovering'].includes(previousState) || room.status === 'ended'
    const broadcastStartedAt = isReconnect
      ? event.occurredAt
      : (typeof metadata.cloudflare_current_broadcast_started_at === 'string'
          ? metadata.cloudflare_current_broadcast_started_at
          : (room.started_at || event.occurredAt))

    updates.status = 'live'
    updates.started_at = room.started_at || event.occurredAt
    updates.ended_at = null
    next.transport_state = 'connected'
    next.cloudflare_current_broadcast_started_at = broadcastStartedAt
    next.cloudflare_last_error = null
  } else if (event.eventType === 'live_input.disconnected') {
    const broadcastStartedAt = typeof metadata.cloudflare_current_broadcast_started_at === 'string'
      ? metadata.cloudflare_current_broadcast_started_at
      : (room.started_at || String(metadata.cloudflare_input_created_at || ''))

    updates.status = 'ended'
    updates.ended_at = event.occurredAt
    next.transport_state = 'disconnected'
    next.cloudflare_replay_sync_state = 'pending'
    next.cloudflare_last_disconnected_at = event.occurredAt

    try {
      const replay = await syncLatestReplay(event.inputId, broadcastStartedAt, event.occurredAt)
      next.cloudflare_replay_sync_state = replay.state
      next.cloudflare_replay_last_checked_at = new Date().toISOString()
      if (replay.videoId) {
        next.cloudflare_replay_video_id = replay.videoId
        next.cloudflare_replay_input_id = replay.inputId
      }
      if (replay.state === 'ready') {
        next.cloudflare_replay_created_at = replay.createdAt
        updates.replay_url = replay.playbackUrl
      }
    } catch {
      next.cloudflare_replay_sync_state = 'retry_required'
      next.cloudflare_replay_last_checked_at = new Date().toISOString()
    }
  } else if (event.eventType === 'live_input.errored') {
    next.transport_state = 'error'
    next.cloudflare_last_error = event.error
  }

  const { error } = await supabase.from('chat_live_rooms').update(updates).eq('id', room.id)
  if (error) return NextResponse.json({ success: false, error: 'No fue posible actualizar la sala.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
