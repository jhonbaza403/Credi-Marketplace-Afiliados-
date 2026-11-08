import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { liveKitRoomName, verifyLiveKitWebhook } from '@/lib/live/livekit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const rawBody = await request.text()
  if (!verifyLiveKitWebhook(rawBody, request.headers.get('Authorization'))) {
    return NextResponse.json({ success: false, error: 'Firma LiveKit inválida.' }, { status: 401 })
  }
  let event: { event?: string; id?: string; createdAt?: number; room?: { name?: string }; participant?: { identity?: string }; egressInfo?: { egressId?: string; status?: string; error?: string } }
  try { event = JSON.parse(rawBody) as typeof event } catch { return NextResponse.json({ success: false, error: 'JSON inválido.' }, { status: 400 }) }
  const roomName = event.room?.name
  const roomId = roomName?.startsWith('credi-live-') ? roomName.slice('credi-live-'.length) : null
  if (!roomId || !/^[0-9a-f-]{36}$/i.test(roomId)) return NextResponse.json({ success: true, ignored: true })

  const admin = createAdminClient()
  const { data: room, error: lookupError } = await admin.from('chat_live_rooms')
    .select('id,host_user_id,status,metadata').eq('id', roomId).maybeSingle()
  if (lookupError) return NextResponse.json({ success: false, error: 'No fue posible localizar la sala.' }, { status: 500 })
  if (!room) return NextResponse.json({ success: true, ignored: true })

  const metadata = room.metadata && typeof room.metadata === 'object' ? room.metadata as Record<string, unknown> : {}
  const next = { ...metadata, livekit_last_event: event.event ?? 'unknown', livekit_last_event_id: event.id ?? null, livekit_last_event_at: event.createdAt ? new Date(event.createdAt * 1000).toISOString() : new Date().toISOString() }
  if (event.event === 'egress_started' && event.egressInfo?.egressId) {
    next.livekit_egress_state = 'active'
    next.livekit_egress_id = event.egressInfo.egressId
  }
  if (event.event === 'egress_ended') {
    next.livekit_egress_state = event.egressInfo?.status ?? 'ended'
    if (event.egressInfo?.error) next.livekit_egress_error = event.egressInfo.error.slice(0, 500)
    next.livekit_egress_id = null
  }
  const updates: Record<string, unknown> = { metadata: next }
  if (event.event === 'participant_joined' && event.participant?.identity === room.host_user_id) {
    updates.status = 'live'
    updates.started_at = new Date().toISOString()
  }
  if (event.event === 'participant_left' && event.participant?.identity === room.host_user_id && room.status === 'live') {
    next.livekit_host_left_at = new Date().toISOString()
  }
  const { error } = await admin.from('chat_live_rooms').update(updates).eq('id', room.id)
  if (error) return NextResponse.json({ success: false, error: 'No fue posible sincronizar el evento.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
