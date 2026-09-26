import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMarketplaceConnectedAccount } from '@/lib/payments/stripe-connect'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'UNAUTHORIZED'},{status:401})
 if(!isSameOrigin(request))return NextResponse.json({error:'CSRF_VALIDATION_FAILED'},{status:403})
 const limit=await distributedRateLimit(supabase,`stripe-connect-create:${user.id}:${getRequestIp(request)}`,{limit:5,windowMs:60_000});if(!limit.success)return NextResponse.json({error:'RATE_LIMITED'},{status:429})
 let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>}catch{return NextResponse.json({error:'INVALID_JSON'},{status:400})}
 const country=typeof body.country==='string'?body.country.trim().toUpperCase():'';const entityType=typeof body.entity_type==='string'?body.entity_type.trim().toLowerCase():''
 if(!/^[A-Z]{2}$/.test(country)||!['individual','company','non_profit','government_entity'].includes(entityType))return NextResponse.json({error:'COUNTRY_AND_ENTITY_TYPE_REQUIRED'},{status:400})
 const admin=createAdminClient();const {data:store,error:storeError}=await admin.from('stores').select('id,store_name,stripe_connect_account_id,stripe_connect_status').eq('vendor_id',user.id).maybeSingle()
 if(storeError)return NextResponse.json({error:'STORE_LOOKUP_FAILED'},{status:500});if(!store)return NextResponse.json({error:'STORE_NOT_FOUND'},{status:404})
 if(store.stripe_connect_account_id)return NextResponse.json({ok:true,account_id:store.stripe_connect_account_id,status:store.stripe_connect_status??'pending',existing:true})
 try{const account=await createMarketplaceConnectedAccount({displayName:store.store_name||user.email||'Credi Marketplace Seller',contactEmail:user.email??'',country,entityType:entityType as 'individual'|'company'|'non_profit'|'government_entity'});const {error}=await admin.from('stores').update({stripe_connect_account_id:account.id,stripe_connect_status:'pending',updated_at:new Date().toISOString()}).eq('id',store.id);if(error)throw error;return NextResponse.json({ok:true,account_id:account.id,status:'pending'})}catch(error){console.error('stripe connect create account',error);return NextResponse.json({error:'STRIPE_CONNECT_ACCOUNT_CREATE_FAILED'},{status:502})}
}
