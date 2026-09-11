import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

async function getAuth(){
 const supabase=await createClient(); const {data}=await supabase.auth.getUser(); return {supabase,user:data.user}
}

export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
 const {supabase,user}=await getAuth(); if(!user)return json({error:'UNAUTHORIZED'},401)
 const {id}=await context.params
 const {data,error}=await supabase.from('commerce_dispute_events').select('id,dispute_id,actor_id,event_type,body,metadata,created_at').eq('dispute_id',id).order('created_at',{ascending:true}).limit(200)
 if(error)return json({error:'DISPUTE_EVENTS_UNAVAILABLE'},500)
 return json({events:data??[]})
}

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
 const {supabase,user}=await getAuth(); if(!user)return json({error:'UNAUTHORIZED'},401)
 const {id}=await context.params
 let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{return json({error:'INVALID_JSON'},400)}
 const eventType=typeof body.event_type==='string'?body.event_type.trim():''
 const text=typeof body.body==='string'?body.body.trim().slice(0,4000):''
 if(!['evidence_added','response_added'].includes(eventType)||text.length<1)return json({error:'EVENT_TYPE_AND_BODY_REQUIRED'},400)
 const {data:dispute}=await supabase.from('commerce_disputes').select('id,status').eq('id',id).maybeSingle()
 if(!dispute)return json({error:'DISPUTE_NOT_FOUND'},404)
 if(['resolved','rejected','cancelled'].includes(dispute.status))return json({error:'DISPUTE_CLOSED'},409)
 const {data:event,error}=await supabase.from('commerce_dispute_events').insert({dispute_id:id,actor_id:user.id,event_type: eventType,body:text,metadata:{source:'credi-trust'}}).select('id,dispute_id,actor_id,event_type,body,metadata,created_at').single()
 if(error||!event)return json({error:'DISPUTE_EVENT_CREATE_FAILED'},500)
 await supabase.from('commerce_disputes').update({status:'under_review',updated_at:new Date().toISOString()}).eq('id',id)
 return json({ok:true,event},201)
}
