import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'
import { createLiveInput, isCloudflareConfigured, setLiveInputEnabled, syncLatestReplay } from '@/lib/cloudflare/stream'
import { requireApiAccountAccess } from '@/lib/auth/api-account-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).default(''),
  scheduledAt: z.string().datetime().nullable().default(null),
  coverMedia: z.array(z.object({ type: z.enum(['image','video']), url: z.string().url().max(4096) })).max(4).default([]),
})

const patchSchema = z.object({
  roomId: z.string().uuid(),
  action: z.enum(['schedule','start','end','cancel','update']),
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  coverMedia: z.array(z.object({ type: z.enum(['image','video']), url: z.string().url().max(4096) })).max(4).optional(),
})

const errorResponse = (message:string,status:number,code:string) =>
  NextResponse.json({ success:false,error:message,code }, { status, headers:{'Cache-Control':'no-store'} })

export async function GET() {
  const supabase = await createClient()
  const { data:{user}, error:authError } = await supabase.auth.getUser()
  if(authError) return errorResponse('No fue posible verificar la sesión.',401,'AUTHENTICATION_ERROR')
  if(!user) return errorResponse('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return errorResponse('La cuenta no cumple los requisitos de seguridad.',access.status,access.code)

  const [{data:rooms,error:roomError},{data:liveRooms}] = await Promise.all([
    supabase.from('chat_live_rooms').select('id,host_user_id,conversation_id,title,status,viewer_count,started_at,ended_at,description,cover_media,scheduled_at,replay_url,playback_url,stream_provider,viewer_peak,likes_count,shares_count,settings,created_at').eq('host_user_id',user.id).order('created_at',{ascending:false}).limit(50),
    supabase.from('chat_live_rooms').select('id,host_user_id,title,status,viewer_count,started_at,description,cover_media,scheduled_at,replay_url,playback_url,stream_provider,viewer_peak,likes_count,shares_count,settings,created_at').eq('status','live').eq('stream_provider','cloudflare_stream').not('playback_url','is',null).order('started_at',{ascending:false}).limit(30),
  ])
  if(roomError) return errorResponse('No fue posible cargar las sesiones LIVE.',500,'LIVE_ROOMS_UNAVAILABLE')
  const safeRooms=(rooms??[]).map(room => room.status==='live' && room.stream_provider!=='cloudflare_stream'
    ? {...room,status:'scheduled',started_at:null}
    : room)
  return NextResponse.json({ rooms:safeRooms, discovery:liveRooms??[] }, { headers:{'Cache-Control':'private, no-store'} })
}

export async function POST(request:Request) {
  const requestId=crypto.randomUUID()
  try {
    if(!isSameOrigin(request)) return errorResponse('Origen no autorizado.',403,'CSRF_VALIDATION_FAILED')
    const supabase=await createClient()
    const {data:{user},error:authError}=await supabase.auth.getUser()
    if(authError) return errorResponse('No fue posible verificar la sesión.',401,'AUTHENTICATION_ERROR')
    if(!user) return errorResponse('Debes iniciar sesión.',401,'UNAUTHENTICATED')
    const access = await requireApiAccountAccess(supabase, user.id)
    if (!access.ok) return errorResponse('La cuenta no cumple los requisitos de seguridad.',access.status,access.code)

    const limit=await distributedRateLimit(supabase,'live:'+user.id+':'+getRequestIp(request),{limit:20,windowMs:60_000})
    if(!limit.success) return errorResponse('Demasiadas solicitudes. Inténtalo más tarde.',429,'RATE_LIMITED')
    const parsed=createSchema.safeParse(await request.json().catch(()=>null))
    if(!parsed.success) return errorResponse('La configuración LIVE no es válida.',400,'INVALID_LIVE_DATA')

    const p=parsed.data
    const scheduledAt=p.scheduledAt ? new Date(p.scheduledAt) : null
    if(scheduledAt && Number.isNaN(scheduledAt.getTime())) return errorResponse('La fecha LIVE no es válida.',400,'INVALID_SCHEDULE')
    const isScheduled = Boolean(scheduledAt && scheduledAt.getTime()>Date.now())

    // A camera preview is not a broadcast. Immediate LIVE sessions require a real
    // server-side transport; never publish a room as live without one.
    if(!isScheduled && !isCloudflareConfigured()) {
      return errorResponse(
        'La transmisión LIVE no está habilitada todavía: configura CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN en Vercel. No se creó una sala falsa.',
        503,
        'CLOUDFLARE_STREAM_NOT_CONFIGURED'
      )
    }
    const status='scheduled'

    const {data:room,error}=await supabase.from('chat_live_rooms').insert({
      host_user_id:user.id,title:p.title,description:p.description,status,
      scheduled_at:scheduledAt?.toISOString()??null,started_at:null,
      cover_media:p.coverMedia,stream_provider:isCloudflareConfigured()?'cloudflare_stream':'external',
      settings:{q_and_a:true,comments:true,record_replay:true,product_pinning:true,moderation:true,reactions:true,guest_stage:true},
      metadata:{module:'CREDI-LIVE',version:'2.3',request_id:requestId,transport_state:isCloudflareConfigured()?'provisioning':'not_configured'}
    }).select('id,host_user_id,title,status,viewer_count,started_at,description,cover_media,scheduled_at,replay_url,playback_url,stream_provider,viewer_peak,likes_count,shares_count,settings,created_at').single()

    if(error||!room){console.error('[live:'+requestId+'] create failed',error);return errorResponse('No fue posible crear la sesión LIVE.',500,'LIVE_ROOM_CREATE_FAILED')}
    let transport:null|{inputId:string;rtmps:{url:string;streamKey:string}|null;srt:{url:string;streamId:string;passphrase:string}|null;playback:{hls?:string;dash?:string}|null;webRTC:{url:string}|null;webRTCPlayback:{url:string}|null;status?:string|null;enabled?:boolean}=null
    if(isCloudflareConfigured()){
      try{
        const input=await createLiveInput(room.id,room.title)
        const metadata={module:'CREDI-LIVE',version:'2.4',request_id:requestId,cloudflare_live_input_id:input.uid,cloudflare_hls_url:input.playback?.hls||null,cloudflare_dash_url:input.playback?.dash||null,cloudflare_input_created_at:new Date().toISOString(),cloudflare_srt_ingest_available:Boolean(input.srt?.url),transport:'cloudflare-stream-rtmps-srt',transport_version:'2026-10',transport_state:'provisioned',cloudflare_recording_mode:input.recording?.mode||'automatic'}
        const {data:linked,error:linkError}=await supabase.from('chat_live_rooms').update({metadata,playback_url:input.playback?.hls||null,stream_provider:'cloudflare_stream'}).eq('id',room.id).select('id,host_user_id,title,status,viewer_count,started_at,description,cover_media,scheduled_at,replay_url,playback_url,stream_provider,viewer_peak,likes_count,shares_count,settings,created_at').single()
        if(linkError||!linked) throw new Error('LIVE_TRANSPORT_LINK_FAILED')
        transport={inputId:input.uid,rtmps:input.rtmps||null,srt:input.srt||null,playback:input.playback||null,webRTC:input.webRTC||null,webRTCPlayback:input.webRTCPlayback||null,status:input.status||null,enabled:input.enabled}
        return NextResponse.json({success:true,room:linked,transport},{status:201,headers:{'Cache-Control':'no-store'}})
      }catch(error){
        console.error('[live:'+requestId+'] cloudflare provisioning failed',error)
        return errorResponse('La sala LIVE fue creada, pero no se pudo provisionar el transporte de producción. Revisa la configuración de Cloudflare Stream en Vercel.',503,'LIVE_TRANSPORT_PROVISION_FAILED')
      }
    }
    return NextResponse.json({success:true,room,transport},{status:201,headers:{'Cache-Control':'no-store'}})
  } catch(error) {
    console.error('[live:'+requestId+'] unexpected',error)
    return errorResponse('No fue posible procesar la sesión LIVE.',500,'LIVE_INTERNAL_ERROR')
  }
}

export async function PATCH(request:Request) {
  if(!isSameOrigin(request)) return errorResponse('Origen no autorizado.',403,'CSRF_VALIDATION_FAILED')
  const supabase=await createClient()
  const {data:{user},error:authError}=await supabase.auth.getUser()
  if(authError) return errorResponse('No fue posible verificar la sesión.',401,'AUTHENTICATION_ERROR')
  if(!user) return errorResponse('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return errorResponse('La cuenta no cumple los requisitos de seguridad.',access.status,access.code)

  const parsed=patchSchema.safeParse(await request.json().catch(()=>null))
  if(!parsed.success) return errorResponse('La operación LIVE no es válida.',400,'INVALID_LIVE_OPERATION')
  const p=parsed.data
  const {data:existing}=await supabase.from('chat_live_rooms').select('id,status,started_at,stream_provider,metadata').eq('id',p.roomId).eq('host_user_id',user.id).maybeSingle()
  if(!existing) return errorResponse('Sesión LIVE no encontrada.',404,'LIVE_ROOM_NOT_FOUND')

  const updates:Record<string,unknown>={}
  if(p.title!==undefined) updates.title=p.title
  if(p.description!==undefined) updates.description=p.description
  if(p.coverMedia!==undefined) updates.cover_media=p.coverMedia
  if(p.scheduledAt!==undefined) updates.scheduled_at=p.scheduledAt
  if(p.action==='schedule'){
    if(!p.scheduledAt||new Date(p.scheduledAt).getTime()<=Date.now()) return errorResponse('Programa el LIVE para una fecha futura.',400,'INVALID_SCHEDULE')
    updates.status='scheduled';updates.started_at=null;updates.ended_at=null
  } else if(p.action==='start'){
    const {data:transportRoom}=await supabase.from('chat_live_rooms').select('stream_provider,metadata').eq('id',p.roomId).eq('host_user_id',user.id).maybeSingle()
    const metadata=(transportRoom?.metadata&&typeof transportRoom.metadata==='object'?transportRoom.metadata:{}) as Record<string,unknown>
    if(!isCloudflareConfigured() || transportRoom?.stream_provider!=='cloudflare_stream' || typeof metadata.cloudflare_live_input_id!=='string') {
      return errorResponse('No se puede iniciar LIVE todavía: falta provisionar el transporte de transmisión. Configura Cloudflare Stream en Vercel y vuelve a preparar la sala.',503,'LIVE_TRANSPORT_NOT_READY')
    }
    return errorResponse('La sala está preparada. Inicia la señal desde OBS u otro codificador RTMPS; Credi marcará LIVE cuando Cloudflare confirme la conexión.',409,'LIVE_WAITING_FOR_ENCODER')
  } else if(p.action==='end'){
    const metadata=(existing.metadata&&typeof existing.metadata==='object'?existing.metadata:{}) as Record<string,unknown>
    const inputId=typeof metadata.cloudflare_live_input_id==='string'?metadata.cloudflare_live_input_id:null
    if(existing.stream_provider==='cloudflare_stream'&&inputId){
      try{
        await setLiveInputEnabled(inputId,false)
        const replay=await syncLatestReplay(inputId,existing.started_at||String(metadata.cloudflare_input_created_at||''))
        metadata.cloudflare_replay_sync_state=replay.state
        metadata.cloudflare_replay_last_checked_at=new Date().toISOString()
        if(replay.videoId)metadata.cloudflare_replay_video_id=replay.videoId
        updates.metadata=metadata
        if(replay.state==='ready')updates.replay_url=replay.playbackUrl
      }catch{
        return errorResponse('No se pudo cerrar el transporte Cloudflare. La sala sigue sin finalizar para evitar dejar una transmisión activa.',502,'LIVE_TRANSPORT_END_FAILED')
      }
    }
    updates.status='ended';updates.ended_at=new Date().toISOString()
  } else if(p.action==='cancel'){updates.status='cancelled';updates.ended_at=new Date().toISOString()}

  const {data:room,error}=await supabase.from('chat_live_rooms').update(updates).eq('id',p.roomId).eq('host_user_id',user.id)
    .select('id,host_user_id,title,status,viewer_count,started_at,ended_at,description,cover_media,scheduled_at,replay_url,playback_url,stream_provider,viewer_peak,likes_count,shares_count,settings,created_at').single()
  if(error||!room) return errorResponse('No fue posible actualizar la sesión LIVE.',500,'LIVE_UPDATE_FAILED')
  return NextResponse.json({success:true,room},{headers:{'Cache-Control':'no-store'}})
}