import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { listInputVideos } from '@/lib/cloudflare/stream'

export const runtime='nodejs'
export const dynamic='force-dynamic'

function verify(body:string,header:string|null,secret:string){
  if(!header)return false
  const values=Object.fromEntries(header.split(',').map(part=>{const [key,value]=part.split('=',2);return [key,value]}))
  const timestamp=Number(values.time)
  const signature=values.sig1
  if(!timestamp||!signature||Math.abs(Date.now()/1000-timestamp)>300)return false
  const expected=crypto.createHmac('sha256',secret).update(`${timestamp}.${body}`,'utf8').digest('hex')
  const a=Buffer.from(expected,'hex');const b=Buffer.from(signature,'hex')
  return a.length===b.length&&crypto.timingSafeEqual(a,b)
}

export async function POST(request:Request){
  const secret=process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET
  if(!secret)return NextResponse.json({success:false,error:'Webhook no configurado.'},{status:503})
  const body=await request.text()
  if(!verify(body,request.headers.get('Webhook-Signature'),secret))return NextResponse.json({success:false,error:'Firma inválida.'},{status:403})
  const payload=JSON.parse(body) as {data?:{input_id?:string;event_type?:string;updated_at?:string;live_input_errored?:{error?:{code?:string;message?:string}}}}
  const inputId=payload.data?.input_id
  const eventType=payload.data?.event_type
  if(!inputId||!eventType)return NextResponse.json({success:true,ignored:true})
  const supabase=await createClient()
  const {data:rooms}=await supabase.from('chat_live_rooms').select('id,metadata,status').contains('metadata',{cloudflare_live_input_id:inputId}).limit(1)
  const room=rooms?.[0]
  if(!room)return NextResponse.json({success:true,ignored:true})
  const metadata=(room.metadata&&typeof room.metadata==='object'?room.metadata:{}) as Record<string,unknown>
  const next: Record<string, unknown> = {...metadata,cloudflare_last_event:eventType,cloudflare_last_event_at:payload.data?.updated_at||new Date().toISOString()}
  const updates:{metadata:Record<string,unknown>;status?:string;ended_at?:string;replay_url?:string}={metadata:next}
  if(eventType==='live_input.connected')updates.status='live'
  if(eventType==='live_input.disconnected'){
    updates.status='ended';updates.ended_at=payload.data?.updated_at||new Date().toISOString()
    try{
      const videos=await listInputVideos(inputId)
      const ready=videos.filter(video=>video.readyToStream||video.status?.state==='ready').at(0)
      if(ready){updates.replay_url=`https://videodelivery.net/${ready.uid}/manifest/video.m3u8`;next.cloudflare_replay_video_id=ready.uid}
    }catch{ /* replay lookup is retried by the next synchronization */ }
  }
  if(eventType==='live_input.errored')next.cloudflare_last_error=payload.data?.live_input_errored?.error||null
  const {error}=await supabase.from('chat_live_rooms').update(updates).eq('id',room.id)
  if(error)return NextResponse.json({success:false,error:'No fue posible actualizar la sala.'},{status:500})
  return NextResponse.json({success:true})
}
