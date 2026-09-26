import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { retrieveMarketplaceAccount } from '@/lib/payments/stripe-connect'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'UNAUTHORIZED'},{status:401})
 const limit=await distributedRateLimit(supabase,`stripe-connect-status:${user.id}:${getRequestIp(request)}`,{limit:30,windowMs:60_000});if(!limit.success)return NextResponse.json({error:'RATE_LIMITED'},{status:429})
 const admin=createAdminClient();const {data:store,error}=await admin.from('stores').select('id,stripe_connect_account_id,stripe_connect_status').eq('vendor_id',user.id).maybeSingle();if(error)return NextResponse.json({error:'STORE_LOOKUP_FAILED'},{status:500});if(!store?.stripe_connect_account_id)return NextResponse.json({ok:true,connected:false,status:'not_started'})
 try{const account=await retrieveMarketplaceAccount(store.stripe_connect_account_id);const config=account.configuration&&typeof account.configuration==='object'?account.configuration as Record<string,unknown>:{};const recipient=config.recipient;const status=recipient&&typeof recipient==='object'?'connected':'pending';if(status!==store.stripe_connect_status)await admin.from('stores').update({stripe_connect_status:status,updated_at:new Date().toISOString()}).eq('id',store.id);return NextResponse.json({ok:true,connected:true,account_id:store.stripe_connect_account_id,status,account})}catch(error){console.error('stripe connect status',error);return NextResponse.json({error:'STRIPE_CONNECT_STATUS_FAILED'},{status:502})}
}
