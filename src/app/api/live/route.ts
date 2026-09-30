import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'
import { createLiveInput, isCloudflareConfigured } from '@/lib/cloudflare/stream'

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

  const [{data:rooms,error:roomError},{data:liveRooms}] = await Promise.all([
    supabase.from('chat_live_rooms').select('id,host_user_id,conversation_id,title,status,viewer_count,started_at,ended_at,description,cover_media,scheduled_at,replay_url,playback_url,stream_provider,viewer_peak,likes_count,shares_count,settings,created_at').eq('host_user_id',user.id).order('created_at',{ascending:false}).limit(50),
    supabase.from('chat_live_rooms').select('id,host_user_id,title,status,viewer_count,started_at,description,cover_media,scheduled_at,replay_url,playback_url,stream_provider,viewer_peak,likes_count,shares_count,settings,created_at').eq('status','live').order('started_at',{ascending:false}).limit(30),
  ])
  if(roomError) return errorResponse('No fue posible cargar las sesiones LIVE.',500,'LIVE_ROOMS_UNAVAILABLE')
  return NextResponse.json({ rooms:rooms??[], discovery:liveRooms??[] }, { headers:{'Cache-Control':'private, no-store'} })
}

export async function POST(request:Request) {
  const requestId=crypto.randomUUID()
  try {
    if(!isSameOrigin(request)) return errorResponse('Origen no autorizado.',403,'CSRF_VALIDATION_FAILED')
    const supabase=await createClient()
    const {data:{user},error:authError}=await supabase.auth.getUser()
    if(authError) return errorResponse('No fue posible verificar la sesión.',401,'AUTHENTICATION_ERROR')
    if(!user) return errorResponse('Debes iniciar sesión.',401,'UNAUTHENTICATED')

    const limit=await distributedRateLimit(supabase,'live:'+user.id+':'+getRequestIp(request),{limit:20,windowMs:60_000})
    if(!limit.success) return errorResponse('Demasiadas solicitudes. Inténtalo más tarde.',429,'RATE_LIMITED')
    const parsed=createSchema.safeParse(await request.json().catch(()=>null))
    if(!parsed.success) return errorResponse('La configuración LIVE no es válida.',400,'INVALID_LIVE_DATA')

    const p=parsed.data
    const scheduledAt=p.scheduledAt ? new Date(p.scheduledAt) : null
    if(scheduledAt && Number.isNaN(scheduledAt.getTime())) return errorResponse('La fecha LIVE no es válida.',400,'INVALID_SCHEDULE')
    const status=scheduledAt && scheduledAt.getTime()>Date.now() ? 'scheduled' : 'live'

    const {data:room,error}=await supabase.from('chat_live_rooms').insert({
      host_user_id:user.id,title:p.title,description:p.description,status,
      scheduled_at:scheduledAt?.toISOString()??null,started_at:status==='live'?new Date().toISOString():null,
      cover_media:p.coverMedia,stream_provider:'external',
      settings:{q_and_a:true,comments:true,record_replay:true,product_pinning:true,moderation:true,reactions:true,guest_stage:true},
      metadata:{module:'CREDI-LIVE',version:'2.1',request_id:requestId}
    }).select('id,host_user_id,title,status,viewer_count,started_at,description,cover_media,scheduled_at,replay_url,playback_url,stream_provider,viewer_peak,likes_count,shares_count,settings,created_at').single()

    if(error||!room){console.error('[live:'+requestId+'] create failed',error);return errorResponse('No fue posible crear la sesión LIVE.',500,'LIVE_ROOM_CREATE_FAILED')}
    let transport:null|{inputId:string;rtmps:{url:string;streamKey:string}|null;playback:{hls?:string;dash?:string}|null;webRTC:{url:string}|null}=null
    if(isCloudflareConfigured()){
      try{
        const input=await createLiveInput(room.id,room.title)
        const metadata={module:'CREDI-LIVE',version:'2.2',request_id:requestId,cloudflare_live_input_id:input.uid,cloudflare_hls_url:input.playback?.hls||null,cloudflare_dash_url:input.playback?.dash||null,cloudflare_whip_url:input.webRTC?.url||null,cloudflare_whep_url:input.webRTCPlayback?.url||null,transport:'cloudflare-stream-rtmps',transport_version:'2026-09'}
        const {data:linked,error:linkError}=await supabase.from('chat_live_rooms').update({metadata,playback_url:input.playback?.hls||null,stream_provider:'cloudflare_stream'}).eq('id',room.id).select('id,host_user_id,title,status,viewer_count,started_at,description,cover_media,scheduled_at,replay_url,playback_url,stream_provider,viewer_peak,likes_count,shares_count,settings,created_at').single()
        if(linkError||!linked) throw new Error('LIVE_TRANSPORT_LINK_FAILED')
        transport={inputId:input.uid,rtmps:input.rtmps||null,playback:input.playback||null,webRTC:input.webRTC||null}
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

  const parsed=patchSchema.safeParse(await request.json().catch(()=>null))
  if(!parsed.success) return errorResponse('La operación LIVE no es válida.',400,'INVALID_LIVE_OPERATION')
  const p=parsed.data
  const {data:existing}=await supabase.from('chat_live_rooms').select('id,status').eq('id',p.roomId).eq('host_user_id',user.id).maybeSingle()
  if(!existing) return errorResponse('Sesión LIVE no encontrada.',404,'LIVE_ROOM_NOT_FOUND')

  const updates:Record<string,unknown>={}
  if(p.title!==undefined) updates.title=p.title
  if(p.description!==undefined) updates.description=p.description
  if(p.coverMedia!==undefined) updates.cover_media=p.coverMedia
  if(p.scheduledAt!==undefined) updates.scheduled_at=p.scheduledAt
  if(p.action==='schedule'){
    if(!p.scheduledAt||new Date(p.scheduledAt).getTime()<=Date.now()) return errorResponse('Programa el LIVE para una fecha futura.',400,'INVALID_SCHEDULE')
    updates.status='scheduled';updates.started_at=null;updates.ended_at=null
  } else if(p.action==='start'){updates.status='live';updates.started_at=new Date().toISOString();updates.ended_at=null
  } else if(p.action==='end'){updates.status='ended';updates.ended_at=new Date().toISOString()
  } else if(p.action==='cancel'){updates.status='cancelled';updates.ended_at=new Date().toISOString()}

  const {data:room,error}=await supabase.from('chat_live_rooms').update(updates).eq('id',p.roomId).eq('host_user_id',user.id)
    .select('id,host_user_id,title,status,viewer_count,started_at,ended_at,description,cover_media,scheduled_at,replay_url,playback_url,stream_provider,viewer_peak,likes_count,shares_count,settings,created_at').single()
  if(error||!room) return errorResponse('No fue posible actualizar la sesión LIVE.',500,'LIVE_UPDATE_FAILED')
  return NextResponse.json({success:true,room},{headers:{'Cache-Control':'no-store'}})
}