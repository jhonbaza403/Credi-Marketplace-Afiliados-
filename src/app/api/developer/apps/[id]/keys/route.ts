import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

export async function GET(_:Request,context:{params:Promise<{id:string}>}){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {id}=await context.params
 const {data:app}=await supabase.from('developer_apps').select('id').eq('id',id).eq('owner_id',auth.user.id).maybeSingle(); if(!app)return json({error:'APP_NOT_FOUND'},404)
 const {data,error}=await supabase.from('developer_api_keys').select('id,key_prefix,label,last_used_at,expires_at,status,created_at').eq('app_id',id).order('created_at',{ascending:false})
 if(error)return json({error:'API_KEYS_UNAVAILABLE'},500); return json({keys:data??[]})
}

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {id}=await context.params
 const {data:app}=await supabase.from('developer_apps').select('id').eq('id',id).eq('owner_id',auth.user.id).maybeSingle(); if(!app)return json({error:'APP_NOT_FOUND'},404)
 let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{body={}}
 const label=typeof body.label==='string'&&body.label.trim()?body.label.trim().slice(0,100):'Production key'
 const raw=`cmk_live_${randomBytes(30).toString('base64url')}`
 const prefix=raw.slice(0,16)
 const hash=createHash('sha256').update(raw).digest('hex')
 const expiresAt=typeof body.expires_at==='string'&&body.expires_at?new Date(body.expires_at).toISOString():null
 const {data,error}=await supabase.from('developer_api_keys').insert({app_id:id,key_prefix:prefix,key_hash:hash,label,expires_at:expiresAt}).select('id,key_prefix,label,expires_at,status,created_at').single()
 if(error)return json({error:'API_KEY_CREATE_FAILED'},500)
 return json({ok:true,key:raw,record:data,warning:'La clave completa se muestra solo una vez. Credi no almacena la clave en texto plano.'},201)
}
