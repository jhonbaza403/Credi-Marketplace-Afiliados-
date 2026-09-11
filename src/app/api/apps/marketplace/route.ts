import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

export async function GET(){
 const supabase=await createClient(); const {data,error}=await supabase.from('marketplace_apps').select('id,publisher_id,name,slug,description,category,pricing_model,status,manifest,created_at,updated_at').eq('status','published').order('created_at',{ascending:false}).limit(100)
 if(error)return json({error:'APP_MARKETPLACE_UNAVAILABLE'},500); return json({apps:data??[]})
}

export async function POST(request:Request){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{return json({error:'INVALID_JSON'},400)}
 const name=typeof body.name==='string'?body.name.trim().slice(0,100):''
 const slug=typeof body.slug==='string'?body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,60):''
 const description=typeof body.description==='string'?body.description.slice(0,1500):null
 const category=typeof body.category==='string'?body.category.slice(0,60):'business'
 const pricing=typeof body.pricing_model==='string'&&['free','subscription','usage','one_time'].includes(body.pricing_model)?body.pricing_model:'free'
 const manifest=body.manifest&&typeof body.manifest==='object'?body.manifest:{}
 if(!name||!slug)return json({error:'NAME_AND_SLUG_REQUIRED'},400)
 const {data,error}=await supabase.from('marketplace_apps').insert({publisher_id:auth.user.id,name,slug,description,category,pricing_model:pricing,manifest}).select('id,name,slug,description,category,pricing_model,status,manifest,created_at').single()
 if(error)return json({error:error.code==='23505'?'APP_SLUG_EXISTS':'APP_CREATE_FAILED'},error.code==='23505'?409:500)
 return json({ok:true,app:data},201)
}
