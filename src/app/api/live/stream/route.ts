import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'
import { createLiveInput,getLiveInput,rotateLiveInputKeys,setLiveInputEnabled } from '@/lib/cloudflare/stream'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const schema=z.object({roomId:z.string().uuid(),action:z.enum(['provision','credentials','rotate','enable','disable'])})
const errorResponse=(error:string,status:number,code:string)=>NextResponse.json({success:false,error,code},{status,headers:{'Cache-Control':'no-store'}})

function credentials(input:Awaited<ReturnType<typeof getLiveInput>>){
  return {inputId:input.uid,rtmps:input.rtmps||null,playback:input.playback||null,webRTC:input.webRTC||null,webRTCPlayback:input.webRTCPlayback||null,status:input.status||null,enabled:input.enabled}
}

export async function POST(request:Request){
  if(!isSameOrigin(request))return errorResponse('Origen no autorizado.',403,'CSRF_VALIDATION_FAILED')
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return errorResponse('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const parsed=schema.safeParse(await request.json().catch(()=>null))
  if(!parsed.success)return errorResponse('Operación de transporte inválida.',400,'INVALID_TRANSPORT_OPERATION')
  const {roomId,action}=parsed.data
  const {data:room}=await supabase.from('chat_live_rooms').select('id,title,status,host_user_id,metadata').eq('id',roomId).eq('host_user_id',user.id).maybeSingle()
  if(!room)return errorResponse('Sala LIVE no encontrada.',404,'LIVE_ROOM_NOT_FOUND')
  const metadata=(room.metadata&&typeof room.metadata==='object'?room.metadata:{}) as Record<string,unknown>
  const inputId=typeof metadata.cloudflare_live_input_id==='string'?metadata.cloudflare_live_input_id:null
  try{
    if(action==='provision'){
      if(inputId){const input=await getLiveInput(inputId);return NextResponse.json({success:true,...credentials(input)},{headers:{'Cache-Control':'no-store'}})}
      const input=await createLiveInput(room.id,room.title)
      const nextMetadata={...metadata,cloudflare_live_input_id:input.uid,cloudflare_hls_url:input.playback?.hls||null,cloudflare_dash_url:input.playback?.dash||null,cloudflare_whip_url:input.webRTC?.url||null,cloudflare_whep_url:input.webRTCPlayback?.url||null,transport:'cloudflare-stream-rtmps',transport_version:'2026-09'}
      const {error}=await supabase.from('chat_live_rooms').update({metadata:nextMetadata,playback_url:input.playback?.hls||null,stream_provider:'cloudflare_stream'}).eq('id',room.id).eq('host_user_id',user.id)
      if(error)return errorResponse('El transporte se creó pero no pudo vincularse a la sala.',500,'LIVE_TRANSPORT_LINK_FAILED')
      return NextResponse.json({success:true,...credentials(input)},{status:201,headers:{'Cache-Control':'no-store'}})
    }
    if(!inputId)return errorResponse('La sala todavía no tiene transporte Cloudflare provisionado.',409,'LIVE_TRANSPORT_NOT_PROVISIONED')
    if(action==='credentials')return NextResponse.json({success:true,...credentials(await getLiveInput(inputId))},{headers:{'Cache-Control':'no-store'}})
    if(action==='rotate')return NextResponse.json({success:true,...credentials(await rotateLiveInputKeys(inputId))},{headers:{'Cache-Control':'no-store'}})
    const input=await setLiveInputEnabled(inputId,action==='enable')
    return NextResponse.json({success:true,...credentials(input)},{headers:{'Cache-Control':'no-store'}})
  }catch(error){
    const message=error instanceof Error?error.message:'UNKNOWN'
    if(message==='CLOUDFLARE_STREAM_NOT_CONFIGURED')return errorResponse('El transporte de producción aún requiere las credenciales de Cloudflare Stream en Vercel.',503,'CLOUDFLARE_STREAM_NOT_CONFIGURED')
    return errorResponse('No fue posible operar el transporte LIVE.',502,'CLOUDFLARE_TRANSPORT_ERROR')
  }
}
