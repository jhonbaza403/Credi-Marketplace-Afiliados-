import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsHeaders, corsPreflight } from '@/lib/security/cors'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const json=(data:unknown,status=200,request?:Request,extra:Record<string,string>={})=>{
 const headers=corsHeaders(request??new Request('http://localhost')); Object.entries(extra).forEach(([k,v])=>headers.set(k,v)); headers.set('X-Content-Type-Options','nosniff')
 return NextResponse.json(data,{status,headers})
}
export function OPTIONS(request:Request){return corsPreflight(request)}

export async function POST(request:Request){
 const auth=request.headers.get('authorization')||''
 const rawKey=auth.startsWith('Bearer ')?auth.slice(7).trim():''
 if(!rawKey||rawKey.length>512)return json({error:'API_KEY_REQUIRED'},401,request)
 const keyHash=createHash('sha256').update(rawKey).digest('hex'); const admin=createAdminClient()
 const {data:keyRow}=await admin.from('developer_api_keys').select('id,app_id,status,expires_at').eq('key_hash',keyHash).eq('status','active').maybeSingle()
 if(!keyRow)return json({error:'INVALID_API_KEY'},401,request)
 if(keyRow.expires_at&&new Date(keyRow.expires_at).getTime()<=Date.now())return json({error:'API_KEY_EXPIRED'},401,request)
 const {data:app}=await admin.from('developer_apps').select('id,owner_id,slug,status,scopes').eq('id',keyRow.app_id).eq('status','active').maybeSingle()
 if(!app||!Array.isArray(app.scopes)||!app.scopes.includes('checkout:create'))return json({error:'SCOPE_REQUIRED',required_scope:'checkout:create'},403,request)
 const now=new Date(); const windowStart=new Date(now); windowStart.setUTCSeconds(0,0); const windowEnd=new Date(windowStart); windowEnd.setUTCMinutes(windowEnd.getUTCMinutes()+1)
 const {data:quotaAllowed,error:quotaError}=await admin.rpc('consume_developer_api_quota',{p_user_id:app.owner_id,p_api_key_id:keyRow.id,p_window_start:windowStart.toISOString().slice(0,10),p_window_end:windowEnd.toISOString().slice(0,10),p_limit:30})
 if(quotaError)return json({error:'RATE_LIMIT_SERVICE_UNAVAILABLE'},503,request)
 if(quotaAllowed===false)return json({error:'RATE_LIMITED',retry_after_seconds:60},429,request,{'Retry-After':'60'})
 const contentType=(request.headers.get('content-type')??'').toLowerCase()
 if(!contentType.includes('application/json'))return json({error:'UNSUPPORTED_MEDIA_TYPE'},415,request)
 const raw=await request.text(); if(raw.length>32_768)return json({error:'REQUEST_TOO_LARGE'},413,request)
 let body:Record<string,unknown>; try{body=JSON.parse(raw) as Record<string,unknown>}catch{return json({error:'INVALID_JSON'},400,request)}
 const amount=Number(body.amount); const currency=typeof body.currency==='string'?body.currency.toUpperCase():'USD'; const method=typeof body.method_type==='string'?body.method_type.toLowerCase():'stripe'
 const headerIdempotency=request.headers.get('idempotency-key')?.trim()||''
 const bodyIdempotency=typeof body.idempotency_key==='string'?body.idempotency_key.trim():''
 const idempotency=headerIdempotency||bodyIdempotency
 if(!idempotency||idempotency.length<16||idempotency.length>200)return json({error:'IDEMPOTENCY_KEY_REQUIRED'},422,request)
 if(headerIdempotency&&bodyIdempotency&&headerIdempotency!==bodyIdempotency)return json({error:'IDEMPOTENCY_KEY_MISMATCH'},409,request)
 if(!Number.isFinite(amount)||amount<=0||amount>1_000_000_000)return json({error:'INVALID_AMOUNT'},422,request)
 if(!/^[A-Z]{3}$/.test(currency))return json({error:'INVALID_CURRENCY'},422,request)
 if(!['stripe','crypto','bank_transfer','wallet','manual'].includes(method))return json({error:'INVALID_METHOD'},422,request)
 const externalKey=`app:${app.id}:${idempotency}`
 const {data:payment,error}=await admin.from('payment_orchestrations').insert({user_id:app.owner_id,amount,currency,method_type:method,provider:method,status:method==='manual'?'requires_action':'pending',client_reference:typeof body.client_reference==='string'?body.client_reference.slice(0,200):`agent-app:${app.slug}`,idempotency_key:externalKey,metadata:{developer_app_id:app.id,agentic:true},expires_at:new Date(Date.now()+30*60*1000).toISOString()}).select('id,amount,currency,method_type,provider,status,client_reference,expires_at,created_at').single()
 if(error){if(error.code==='23505'){const {data:existing}=await admin.from('payment_orchestrations').select('id,amount,currency,method_type,provider,status,client_reference,expires_at,created_at').eq('idempotency_key',externalKey).maybeSingle();if(existing)return json({idempotent:true,payment:existing},200,request)}return json({error:'CHECKOUT_INTENT_FAILED'},503,request)}
 await admin.from('developer_api_keys').update({last_used_at:now.toISOString()}).eq('id',keyRow.id)
 return json({ok:true,requires_human_confirmation:true,payment},201,request)
}
