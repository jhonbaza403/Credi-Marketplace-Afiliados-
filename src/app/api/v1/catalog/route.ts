import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { corsHeaders, corsPreflight } from '@/lib/security/cors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (data: unknown, status = 200, request?: Request, extra: Record<string,string> = {}) => {
  const headers = corsHeaders(request ?? new Request('http://localhost'))
  Object.entries(extra).forEach(([k,v]) => headers.set(k,v))
  headers.set('X-Content-Type-Options','nosniff')
  return NextResponse.json(data,{status,headers})
}
export function OPTIONS(request: Request) { return corsPreflight(request) }

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const key = auth.startsWith('Bearer ')?auth.slice(7).trim():''
  if(!key || key.length > 512) return json({error:'API_KEY_REQUIRED'},401,request)
  const hash = createHash('sha256').update(key).digest('hex')
  const admin = createAdminClient()
  const {data:keyRow,error:keyError}=await admin.from('developer_api_keys').select('id,app_id,status,expires_at').eq('key_hash',hash).eq('status','active').maybeSingle()
  if(keyError||!keyRow)return json({error:'INVALID_API_KEY'},401,request)
  if(keyRow.expires_at&&new Date(keyRow.expires_at).getTime()<=Date.now())return json({error:'API_KEY_EXPIRED'},401,request)
  const {data:app}=await admin.from('developer_apps').select('id,owner_id,status,scopes').eq('id',keyRow.app_id).eq('status','active').maybeSingle()
  if(!app||!Array.isArray(app.scopes)||!app.scopes.includes('catalog:read'))return json({error:'SCOPE_REQUIRED',required_scope:'catalog:read'},403,request)
  const now=new Date(); const windowStart=new Date(now); windowStart.setUTCSeconds(0,0); const windowEnd=new Date(windowStart); windowEnd.setUTCMinutes(windowEnd.getUTCMinutes()+1)
  const {data:quotaAllowed,error:quotaError}=await admin.rpc('consume_developer_api_quota',{p_user_id:app.owner_id,p_api_key_id:keyRow.id,p_window_start:windowStart.toISOString().slice(0,10),p_window_end:windowEnd.toISOString().slice(0,10),p_limit:120})
  if(quotaError)return json({error:'RATE_LIMIT_SERVICE_UNAVAILABLE'},503,request)
  if(quotaAllowed===false)return json({error:'RATE_LIMITED',retry_after_seconds:60},429,request,{'Retry-After':'60','Cache-Control':'no-store'})
  await admin.from('developer_api_keys').update({last_used_at:now.toISOString()}).eq('id',keyRow.id)
  const url=new URL(request.url); const q=url.searchParams.get('q')?.trim().slice(0,200).toLowerCase()||''; const parsedLimit=Number(url.searchParams.get('limit')||50); const limit=Math.min(Math.max(Number.isFinite(parsedLimit)?parsedLimit:50,1),100)
  let query=admin.from('published_products').select('id,title,slug,description,price,stock,image_url,images,is_active,updated_at').eq('is_active',true).gt('stock',0).limit(limit)
  if(q)query=query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  const {data,error}=await query
  if(error)return json({error:'CATALOG_UNAVAILABLE'},503,request)
  return json({version:'v1',app_id:app.id,products:data??[]},200,request,{'Cache-Control':'private, max-age=30'})
}
