import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

export async function GET(){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {data,error}=await supabase.from('commerce_disputes').select('id,order_id,opened_by,counterparty_id,store_id,reason,description,status,resolution,metadata,created_at,updated_at').order('created_at',{ascending:false}).limit(100)
 if(error)return json({error:'DISPUTES_UNAVAILABLE'},500); return json({disputes:data??[]})
}

export async function POST(request:Request){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{return json({error:'INVALID_JSON'},400)}
 const reason=typeof body.reason==='string'?body.reason.trim().slice(0,120):''; const description=typeof body.description==='string'?body.description.trim().slice(0,4000):''
 const orderId=typeof body.order_id==='string'&&body.order_id?body.order_id:null; const counterparty=typeof body.counterparty_id==='string'&&body.counterparty_id?body.counterparty_id:null; const storeId=typeof body.store_id==='string'&&body.store_id?body.store_id:null
 if(!reason||description.length<10)return json({error:'REASON_AND_DESCRIPTION_REQUIRED'},400)
 const {data,error}=await supabase.from('commerce_disputes').insert({order_id:orderId,opened_by:auth.user.id,counterparty_id:counterparty,store_id:storeId,reason,description,metadata:{source:'credi-trust'}}).select('id,order_id,reason,description,status,created_at').single()
 if(error)return json({error:'DISPUTE_CREATE_FAILED'},500); return json({ok:true,dispute:data},201)
}
