import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function GET(request:Request){
 const auth=request.headers.get('authorization')||''
 const key=auth.startsWith('Bearer ')?auth.slice(7).trim():''
 if(!key)return NextResponse.json({error:'API_KEY_REQUIRED'},{status:401})
 const hash=createHash('sha256').update(key).digest('hex')
 const admin=createAdminClient()
 const {data:keyRow,error:keyError}=await admin.from('developer_api_keys').select('id,app_id,status,expires_at').eq('key_hash',hash).eq('status','active').maybeSingle()
 if(keyError||!keyRow)return NextResponse.json({error:'INVALID_API_KEY'},{status:401})
 if(keyRow.expires_at&&new Date(keyRow.expires_at).getTime()<=Date.now())return NextResponse.json({error:'API_KEY_EXPIRED'},{status:401})
 const {data:app}=await admin.from('developer_apps').select('id,status,scopes').eq('id',keyRow.app_id).eq('status','active').maybeSingle()
 if(!app||!Array.isArray(app.scopes)||!app.scopes.includes('catalog:read'))return NextResponse.json({error:'SCOPE_REQUIRED',required_scope:'catalog:read'},{status:403})
 await admin.from('developer_api_keys').update({last_used_at:new Date().toISOString()}).eq('id',keyRow.id)
 const url=new URL(request.url); const q=url.searchParams.get('q')?.trim().toLowerCase()||''; const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||50),1),100)
 let query=admin.from('published_products').select('id,title,slug,description,price,stock,image_url,images,is_active,updated_at').eq('is_active',true).gt('stock',0).limit(limit)
 if(q)query=query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
 const {data,error}=await query
 if(error)return NextResponse.json({error:'CATALOG_UNAVAILABLE'},{status:500})
 return NextResponse.json({version:'v1',app_id:app.id,products:data??[]},{headers:{'Cache-Control':'private, max-age=30'}})
}
