import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { listInputVideos } from '@/lib/cloudflare/stream'

export const runtime='nodejs'
export const dynamic='force-dynamic'

function verify(body:string,header:string|null,secret:string){
  if(!header)return false
  const values=Object.fromEntries(header.split(',').map(part=>{
    const [key,...rest]=part.trim().split('=')
    return [key,rest.join('=')]
  }))
  const timestamp=Number(values.time)
  const signature=values.sig1
  if(!Number.isSafeInteger(timestamp)||!signature||! /^[a-f0-9]{64}$/i.test(signature))return false
  if(Math.abs(Date.now()/1000-timestamp)>300)return false
  const expected=crypto.createHmac('sha256',secret).update(`${timestamp}.${body}`,'utf8').digest()
  const received=Buffer.from(signature,'hex')
  return expected.length===received.length&&crypto.timingSafeEqual(expected,received)
}

type CloudflareWebhookPayload={
  data?:{
    input_id?:string
    event_type?:string
    updated_at?:string
    live_input_errored?:{error?:{code?:string;message?:string}}
  }
}

export async function POST(request:Request){
  const secret=process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET
  if(!secret)return NextResponse.json({success:false,error:'Webhook no configurado.'},{status:503})
  const body=await request.text()
  if(!verify(body,request.headers.get('Webhook-Signature'),secret))return NextResponse.json({success:false,error:'Firma inválida.'},{status:403})

  let payload:CloudflareWebhookPayload
  try{payload=JSON.parse(body) as CloudflareWebhookPayload}
  catch{return NextResponse.json({success:false,error:'Evento JSON inválido.'},{status:400})}

  const inputId=payload.data?.input_id
  const eventType=payload.data?.event_type
  if(!inputId||!eventType)return NextResponse.json({success:true,ignored:true})
  if(!['live_input.connected','live_input.disconnected','live_input.errored'].includes(eventType)){
    return NextResponse.json({success:true,ignored:true})
  }

  try{
    // Cloudflare calls this endpoint without a browser session. A cookie-bound
    // Supabase client has no authenticated user here and RLS blocks the update.
    // Use the server-only admin client only after validating Cloudflare's HMAC.
    const supabase=createAdminClient()
    const {data:rooms,error:lookupError}=await supabase
      .from('chat_live_rooms')
      .select('id,metadata,status')
      .contains('metadata',{cloudflare_live_input_id:inputId})
      .limit(1)
    if(lookupError)throw lookupError
    const room=rooms?.[0]
    if(!room)return NextResponse.json({success:true,ignored:true})

    const metadata=(room.metadata&&typeof room.metadata==='object'?room.metadata:{}) as Record<string,unknown>
    const next:Record<string,unknown>={...metadata,cloudflare_last_event:eventType,cloudflare_last_event_at:payload.data?.updated_at||new Date().toISOString()}
    const updates:{metadata:Record<string,unknown>;status?:string;ended_at?:string;replay_url?:string}={metadata:next}

    if(eventType==='live_input.connected'){
      updates.status='live'
    }
    if(eventType==='live_input.disconnected'){
      updates.status='ended'
      updates.ended_at=payload.data?.updated_at||new Date().toISOString()
      try{
        const videos=await listInputVideos(inputId)
        const ready=videos.find(video=>video.readyToStream||video.status?.state==='ready')
        if(ready){
          updates.replay_url=`https://videodelivery.net/${ready.uid}/manifest/video.m3u8`
          next.cloudflare_replay_video_id=ready.uid
        }
      }catch(error){
        console.error('[live:webhook] replay lookup failed',error instanceof Error?error.message:'UNKNOWN')
      }
    }
    if(eventType==='live_input.errored')next.cloudflare_last_error=payload.data?.live_input_errored?.error||null

    const {error:updateError}=await supabase.from('chat_live_rooms').update(updates).eq('id',room.id)
    if(updateError)throw updateError
    return NextResponse.json({success:true})
  }catch(error){
    console.error('[live:webhook] event processing failed',error instanceof Error?error.message:'UNKNOWN')
    return NextResponse.json({success:false,error:'No fue posible sincronizar el evento LIVE.'},{status:500})
  }
}
