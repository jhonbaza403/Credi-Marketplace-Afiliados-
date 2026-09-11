import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (data: unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

export async function GET(){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {data,error}=await supabase.from('developer_apps').select('id,name,slug,description,scopes,redirect_urls,status,created_at,updated_at').eq('owner_id',auth.user.id).order('created_at',{ascending:false})
 if(error)return json({error:'DEVELOPER_APPS_UNAVAILABLE'},500); return json({apps:data??[]})
}

export async function POST(request:Request){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{return json({error:'INVALID_JSON'},400)}
 const name=typeof body.name==='string'?body.name.trim().slice(0,100):''
 const slug=typeof body.slug==='string'?body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,60):''
 const description=typeof body.description==='string'?body.description.trim().slice(0,1000):null
 const scopes=Array.isArray(body.scopes)?body.scopes.filter((v):v is string=>typeof v==='string').slice(0,20):[]
 const redirectUrls=Array.isArray(body.redirect_urls)?body.redirect_urls.filter((v):v is string=>typeof v==='string').slice(0,10):[]
 if(!name||!slug)return json({error:'NAME_AND_SLUG_REQUIRED'},400)
 const {data,error}=await supabase.from('developer_apps').insert({owner_id:auth.user.id,name,slug,description,scopes,redirect_urls:redirectUrls}).select('id,name,slug,description,scopes,redirect_urls,status,created_at').single()
 if(error)return json({error:error.code==='23505'?'APP_SLUG_EXISTS':'APP_CREATE_FAILED'},error.code==='23505'?409:500)
 return json({ok:true,app:data},201)
}
