import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'
import {
  classifyLiveInputStatus,
  createLiveInput,
  getLiveInput,
  rotateLiveInputKeys,
  setLiveInputEnabled,
  syncLatestReplay,
} from '@/lib/cloudflare/stream'
import { requireApiAccountAccess } from '@/lib/auth/api-account-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  roomId: z.string().uuid(),
  action: z.enum(['provision', 'credentials', 'diagnostics', 'rotate', 'enable', 'disable', 'recover', 'sync-replay']),
})
const errorResponse = (error: string, status: number, code: string) =>
  NextResponse.json({ success: false, error, code }, { status, headers: { 'Cache-Control': 'no-store' } })

function credentials(input: Awaited<ReturnType<typeof getLiveInput>>) {
  return {
    inputId: input.uid,
    rtmps: input.rtmps || null,
    srt: input.srt || null,
    playback: input.playback || null,
    webRTC: input.webRTC || null,
    webRTCPlayback: input.webRTCPlayback || null,
    status: input.status || null,
    statusCategory: classifyLiveInputStatus(input.status),
    enabled: input.enabled,
    recordingMode: input.recording?.mode || 'automatic',
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse('Origen no autorizado.', 403, 'CSRF_VALIDATION_FAILED')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Debes iniciar sesión.', 401, 'UNAUTHENTICATED')

  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return errorResponse('La cuenta no cumple los requisitos de seguridad.', access.status, access.code)

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return errorResponse('Operación de transporte inválida.', 400, 'INVALID_TRANSPORT_OPERATION')

  const { roomId, action } = parsed.data
  const { data: room } = await supabase
    .from('chat_live_rooms')
    .select('id,title,status,host_user_id,metadata,started_at')
    .eq('id', roomId)
    .eq('host_user_id', user.id)
    .maybeSingle()

  if (!room) return errorResponse('Sala LIVE no encontrada.', 404, 'LIVE_ROOM_NOT_FOUND')

  const metadata = (room.metadata && typeof room.metadata === 'object' ? room.metadata : {}) as Record<string, unknown>
  const inputId = typeof metadata.cloudflare_live_input_id === 'string' ? metadata.cloudflare_live_input_id : null

  try {
    if (action === 'provision') {
      if (inputId) {
        const input = await getLiveInput(inputId)
        return NextResponse.json({ success: true, ...credentials(input) }, { headers: { 'Cache-Control': 'no-store' } })
      }

      const input = await createLiveInput(room.id, room.title)
      const nextMetadata = {
        ...metadata,
        cloudflare_live_input_id: input.uid,
        cloudflare_hls_url: input.playback?.hls || null,
        cloudflare_dash_url: input.playback?.dash || null,
        cloudflare_input_created_at: new Date().toISOString(),
        transport: 'cloudflare-stream-rtmps-srt',
        transport_version: '2026-10',
        transport_state: 'provisioned',
        cloudflare_recording_mode: input.recording?.mode || 'automatic',
      }
      const { error } = await supabase
        .from('chat_live_rooms')
        .update({
          metadata: nextMetadata,
          playback_url: input.playback?.hls || null,
          stream_provider: 'cloudflare_stream',
        })
        .eq('id', room.id)
        .eq('host_user_id', user.id)

      if (error) return errorResponse('El transporte se creó pero no pudo vincularse a la sala.', 500, 'LIVE_TRANSPORT_LINK_FAILED')
      return NextResponse.json({ success: true, ...credentials(input) }, {
        status: 201,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    if (!inputId) return errorResponse('La sala todavía no tiene transporte Cloudflare provisionado.', 409, 'LIVE_TRANSPORT_NOT_PROVISIONED')

    if (action === 'sync-replay') {
      const replay = await syncLatestReplay(inputId, room.started_at || String(metadata.cloudflare_input_created_at || ''))
      const checkedAt = new Date().toISOString()
      const nextMetadata = {
        ...metadata,
        cloudflare_replay_sync_state: replay.state,
        cloudflare_replay_last_checked_at: checkedAt,
        ...(replay.videoId ? { cloudflare_replay_video_id: replay.videoId } : {}),
      }
      const updates: Record<string, unknown> = { metadata: nextMetadata }
      if (replay.state === 'ready') updates.replay_url = replay.playbackUrl
      const { error } = await supabase.from('chat_live_rooms').update(updates).eq('id', room.id).eq('host_user_id', user.id)
      if (error) return errorResponse('La grabación se detectó, pero no se pudo sincronizar con la sala.', 500, 'LIVE_REPLAY_SYNC_FAILED')

      return NextResponse.json({
        success: true,
        replaySync: {
          state: replay.state,
          videoId: replay.videoId,
          playbackUrl: replay.state === 'ready' ? replay.playbackUrl : null,
          dashUrl: replay.state === 'ready' ? replay.dashUrl : null,
          checkedAt,
        },
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (action === 'credentials' || action === 'diagnostics') {
      const input = await getLiveInput(inputId)
      return NextResponse.json({
        success: true,
        ...credentials(input),
        diagnostics: {
          provider: 'Cloudflare Stream',
          enabled: input.enabled,
          state: classifyLiveInputStatus(input.status),
          status: input.status || 'unknown',
          ingest: {
            rtmps: Boolean(input.rtmps?.url && input.rtmps?.streamKey),
            srt: Boolean(input.srt?.url && input.srt?.streamId && input.srt?.passphrase),
          },
          playback: {
            hls: Boolean(input.playback?.hls),
            dash: Boolean(input.playback?.dash),
          },
          recording: input.recording?.mode || 'automatic',
          checkedAt: new Date().toISOString(),
        },
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (action === 'recover') {
      const current = await getLiveInput(inputId)
      const providerRequiresRestart = ['ttl_exceeded', 'failed_to_connect', 'failed_to_reconnect'].includes(current.status || '')
      let input = current
      if (!current.enabled || providerRequiresRestart) {
        if (current.enabled) await setLiveInputEnabled(inputId, false)
        input = await setLiveInputEnabled(inputId, true)
      }
      return NextResponse.json({
        success: true,
        recovered: !current.enabled || providerRequiresRestart,
        ...credentials(input),
        diagnostics: {
          state: classifyLiveInputStatus(input.status),
          status: input.status || 'unknown',
          enabled: input.enabled,
          checkedAt: new Date().toISOString(),
        },
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (action === 'rotate') {
      return NextResponse.json({ success: true, ...credentials(await rotateLiveInputKeys(inputId)) }, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const input = await setLiveInputEnabled(inputId, action === 'enable')
    return NextResponse.json({ success: true, ...credentials(input) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    if (message === 'CLOUDFLARE_STREAM_NOT_CONFIGURED') {
      return errorResponse('El transporte de producción aún requiere las credenciales de Cloudflare Stream en Vercel.', 503, 'CLOUDFLARE_STREAM_NOT_CONFIGURED')
    }
    return errorResponse('No fue posible operar el transporte LIVE. Revisa la configuración y el estado del proveedor.', 502, 'CLOUDFLARE_TRANSPORT_ERROR')
  }
}
