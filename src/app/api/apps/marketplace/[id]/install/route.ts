import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

export async function GET(_:Request,context:{params:Promise<{id:string}>}){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {id}=await context.params; const {data,error}=await supabase.from('marketplace_app_installations').select('id,app_id,user_id,status,scopes,config,installed_at,updated_at').eq('app_id',id).eq('user_id',auth.user.id).maybeSingle()
 if(error)return json({error:'INSTALLATION_LOOKUP_FAILED'},500); return json({installation:data??null})
}

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {id}=await context.params; const {data:app}=await supabase.from('marketplace_apps').select('id,status,manifest').eq('id',id).eq('status','published').maybeSingle(); if(!app)return json({error:'APP_NOT_FOUND'},404)
 let body:Record<string,unknown>={}; try{body=await request.json() as Record<string,unknown>}catch{}
 const requested=Array.isArray(body.scopes)?body.scopes.filter((x):x is string=>typeof x==='string').slice(0,20):[]; const allowed=Array.isArray((app.manifest as any)?.scopes)?(app.manifest as any).scopes.filter((x:any)=>typeof x==='string'):[]; const scopes=requested.length?requested.filter(s=>allowed.length?allowed.includes(s):true):allowed
 const config=body.config&&typeof body.config==='object'?body.config:{}
 const {data,error}=await supabase.from('marketplace_app_installations').upsert({app_id:id,user_id:auth.user.id,status:'active',scopes,config,updated_at:new Date().toISOString()},{onConflict:'app_id,user_id'}).select('id,app_id,status,scopes,config,installed_at,updated_at').single()
 if(error)return json({error:'INSTALL_FAILED'},500); return json({ok:true,installation:data},201)
}

export async function DELETE(_:Request,context:{params:Promise<{id:string}>}){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {id}=await context.params; const {error}=await supabase.from('marketplace_app_installations').update({status:'revoked',updated_at:new Date().toISOString()}).eq('app_id',id).eq('user_id',auth.user.id)
 if(error)return json({error:'UNINSTALL_FAILED'},500); return json({ok:true,status:'revoked'})
}
