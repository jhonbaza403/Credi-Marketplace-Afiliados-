import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMarketplaceAccountLink } from '@/lib/payments/stripe-connect'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'UNAUTHORIZED'},{status:401})
 if(!isSameOrigin(request))return NextResponse.json({error:'CSRF_VALIDATION_FAILED'},{status:403})
 const limit=await distributedRateLimit(supabase,`stripe-connect-link:${user.id}:${getRequestIp(request)}`,{limit:10,windowMs:60_000});if(!limit.success)return NextResponse.json({error:'RATE_LIMITED'},{status:429})
 const admin=createAdminClient();const {data:store,error}=await admin.from('stores').select('id,stripe_connect_account_id').eq('vendor_id',user.id).maybeSingle();if(error)return NextResponse.json({error:'STORE_LOOKUP_FAILED'},{status:500});if(!store?.stripe_connect_account_id)return NextResponse.json({error:'STRIPE_CONNECT_ACCOUNT_NOT_FOUND'},{status:409})
 const site=(process.env.NEXT_PUBLIC_SITE_URL||process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin).replace(/\/$/,'')
 try{const link=await createMarketplaceAccountLink({accountId:store.stripe_connect_account_id,returnUrl:`${site}/seller/stripe/return?store_id=${encodeURIComponent(store.id)}`,refreshUrl:`${site}/seller/stripe/onboarding?store_id=${encodeURIComponent(store.id)}`});return NextResponse.json({ok:true,url:link.url,expires_at:link.expires_at??null})}catch(error){console.error('stripe connect account link',error);return NextResponse.json({error:'STRIPE_CONNECT_ACCOUNT_LINK_FAILED'},{status:502})}
}
