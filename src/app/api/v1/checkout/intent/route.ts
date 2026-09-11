import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

export async function POST(request:Request){
 const auth=request.headers.get('authorization')||''
 const rawKey=auth.startsWith('Bearer ')?auth.slice(7).trim():''
 if(!rawKey)return json({error:'API_KEY_REQUIRED'},401)
 const keyHash=createHash('sha256').update(rawKey).digest('hex'); const admin=createAdminClient()
 const {data:keyRow}=await admin.from('developer_api_keys').select('id,app_id,status,expires_at').eq('key_hash',keyHash).eq('status','active').maybeSingle()
 if(!keyRow)return json({error:'INVALID_API_KEY'},401)
 if(keyRow.expires_at&&new Date(keyRow.expires_at).getTime()<=Date.now())return json({error:'API_KEY_EXPIRED'},401)
 const {data:app}=await admin.from('developer_apps').select('id,status,scopes').eq('id',keyRow.app_id).eq('status','active').maybeSingle()
 if(!app||!Array.isArray(app.scopes)||!app.scopes.includes('checkout:create'))return json({error:'SCOPE_REQUIRED',required_scope:'checkout:create'},403)
 let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{return json({error:'INVALID_JSON'},400)}
 const amount=Number(body.amount); const currency=typeof body.currency==='string'?body.currency.toUpperCase():'USD'; const method=typeof body.method_type==='string'?body.method_type.toLowerCase():'stripe'; const idempotency=typeof body.idempotency_key==='string'&&body.idempotency_key.trim()?body.idempotency_key.trim().slice(0,200):crypto.randomUUID()
 if(!Number.isFinite(amount)||amount<=0)return json({error:'INVALID_AMOUNT'},400)
 if(!/^[A-Z]{3}$/.test(currency))return json({error:'INVALID_CURRENCY'},400)
 if(!['stripe','crypto','bank_transfer','wallet','manual'].includes(method))return json({error:'INVALID_METHOD'},400)
 const externalKey=`app:${app.id}:${idempotency}`
 const {data:payment,error}=await admin.from('payment_orchestrations').insert({user_id:null,amount,currency,method_type:method,provider:method,status:'pending',client_reference:typeof body.client_reference==='string'?body.client_reference.slice(0,200):`agent-app:${app.slug}`,idempotency_key:externalKey,metadata:{developer_app_id:app.id,agentic:true},expires_at:new Date(Date.now()+30*60*1000).toISOString()}).select('id,amount,currency,method_type,provider,status,client_reference,expires_at,created_at').single()
 if(error){if(error.code==='23505'){const {data:existing}=await admin.from('payment_orchestrations').select('id,amount,currency,method_type,provider,status,client_reference,expires_at,created_at').eq('idempotency_key',externalKey).maybeSingle(); if(existing)return json({idempotent:true,payment:existing})} return json({error:'CHECKOUT_INTENT_FAILED'},500)}
 await admin.from('developer_api_keys').update({last_used_at:new Date().toISOString()}).eq('id',keyRow.id)
 return json({ok:true,requires_human_confirmation:true,payment},201)
}
