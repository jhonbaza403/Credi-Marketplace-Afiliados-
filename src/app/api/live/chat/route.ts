import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'
import { requireApiAccountAccess } from '@/lib/auth/api-account-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postSchema = z.object({
  roomId: z.string().uuid(),
  body: z.string().trim().min(1).max(500),
})

const reactionSchema = z.object({
  roomId: z.string().uuid(),
  reaction: z.enum(['❤️','👍','🔥','👏','😂','😍']),
})

function errorResponse(message:string,status:number,code:string){
  return NextResponse.json({success:false,error:message,code},{status,headers:{'Cache-Control':'no-store'}})
}

async function getUser(request:Request){
  const supabase=await createClient()
  const {data:{user},error}=await supabase.auth.getUser()
  if(error||!user) return {supabase,user:null}
  return {supabase,user}
}

export async function GET(request:Request){
  const {supabase,user}=await getUser(request)
  if(!user) return errorResponse('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return errorResponse('La cuenta no cumple los requisitos de seguridad.',access.status,access.code)
  const roomId=new URL(request.url).searchParams.get('roomId')
  const parsed=z.string().uuid().safeParse(roomId)
  if(!parsed.success) return errorResponse('La sala LIVE no es válida.',400,'INVALID_ROOM')
  const {data:room,error:roomError}=await supabase.from('chat_live_rooms').select('id,status,host_user_id').eq('id',parsed.data).maybeSingle()
  if(roomError) return errorResponse('No fue posible verificar la sala.',500,'LIVE_ROOM_LOOKUP_FAILED')
  if(!room) return errorResponse('Sala LIVE no encontrada.',404,'LIVE_ROOM_NOT_FOUND')
  if(room.status!=='live'&&room.host_user_id!==user.id) return errorResponse('El chat de esta sala no está disponible.',403,'CHAT_NOT_AVAILABLE')
  const {data:messages,error}=await supabase.from('chat_live_messages').select('id,room_id,sender_id,body,created_at,deleted_at,profiles:sender_id(id,full_name,avatar_url)').eq('room_id',parsed.data).is('deleted_at',null).order('created_at',{ascending:false}).limit(80)
  if(error) return errorResponse('No fue posible cargar el chat.',500,'CHAT_LOAD_FAILED')
  return NextResponse.json({messages:(messages??[]).reverse()},{headers:{'Cache-Control':'private, no-store'}})
}

export async function POST(request:Request){
  if(!isSameOrigin(request)) return errorResponse('Origen no autorizado.',403,'CSRF_VALIDATION_FAILED')
  const {supabase,user}=await getUser(request)
  if(!user) return errorResponse('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return errorResponse('La cuenta no cumple los requisitos de seguridad.',access.status,access.code)
  const limit=await distributedRateLimit(supabase,'live-chat:'+user.id+':'+getRequestIp(request),{limit:12,windowMs:10_000})
  if(!limit.success) return errorResponse('Estás enviando mensajes demasiado rápido.',429,'RATE_LIMITED')
  const parsed=postSchema.safeParse(await request.json().catch(()=>null))
  if(!parsed.success) return errorResponse('El mensaje no es válido.',400,'INVALID_MESSAGE')
  const {roomId,body}=parsed.data
  const {data:room}=await supabase.from('chat_live_rooms').select('id,status').eq('id',roomId).maybeSingle()
  if(!room) return errorResponse('Sala LIVE no encontrada.',404,'LIVE_ROOM_NOT_FOUND')
  if(room.status!=='live') return errorResponse('El LIVE no está activo.',409,'LIVE_NOT_ACTIVE')
  const {data:blocked}=await supabase.from('chat_live_blocked_keywords').select('keyword').eq('room_id',roomId)
  const normalized=body.toLocaleLowerCase()
  if((blocked??[]).some(row=>normalized.includes(String(row.keyword).toLocaleLowerCase()))) return errorResponse('El mensaje contiene contenido bloqueado por moderación.',422,'MESSAGE_MODERATED')
  const {data:message,error}=await supabase.from('chat_live_messages').insert({room_id:roomId,sender_id:user.id,body}).select('id,room_id,sender_id,body,created_at,deleted_at,profiles:sender_id(id,full_name,avatar_url)').single()
  if(error||!message) return errorResponse('No fue posible publicar el mensaje.',500,'CHAT_SEND_FAILED')
  return NextResponse.json({success:true,message},{status:201,headers:{'Cache-Control':'no-store'}})
}

export async function PUT(request:Request){
  if(!isSameOrigin(request)) return errorResponse('Origen no autorizado.',403,'CSRF_VALIDATION_FAILED')
  const {supabase,user}=await getUser(request)
  if(!user) return errorResponse('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const access = await requireApiAccountAccess(supabase, user.id)
  if (!access.ok) return errorResponse('La cuenta no cumple los requisitos de seguridad.',access.status,access.code)
  const parsed=reactionSchema.safeParse(await request.json().catch(()=>null))
  if(!parsed.success) return errorResponse('La reacción no es válida.',400,'INVALID_REACTION')
  const limit=await distributedRateLimit(supabase,'live-reaction:'+user.id+':'+getRequestIp(request),{limit:30,windowMs:10_000})
  if(!limit.success) return errorResponse('Demasiadas reacciones. Inténtalo en un momento.',429,'RATE_LIMITED')
  const {roomId,reaction}=parsed.data
  const {data:room}=await supabase.from('chat_live_rooms').select('id,status').eq('id',roomId).maybeSingle()
  if(!room) return errorResponse('Sala LIVE no encontrada.',404,'LIVE_ROOM_NOT_FOUND')
  if(room.status!=='live') return errorResponse('El LIVE no está activo.',409,'LIVE_NOT_ACTIVE')
  const {error}=await supabase.from('chat_live_reactions').insert({room_id:roomId,user_id:user.id,reaction})
  if(error) return errorResponse('No fue posible registrar la reacción.',500,'REACTION_FAILED')
  return NextResponse.json({success:true},{headers:{'Cache-Control':'no-store'}})
}
