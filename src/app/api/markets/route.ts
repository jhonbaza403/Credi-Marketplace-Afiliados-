import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 const supabase=await createClient(); const country=new URL(request.url).searchParams.get('country')?.toUpperCase()||''
 let q=supabase.from('commerce_market_rules').select('country_code,currency,locale,tax_mode,payment_methods,restricted_categories,active,metadata').eq('active',true).order('country_code')
 if(country)q=q.eq('country_code',country)
 const {data,error}=await q.limit(100); if(error)return NextResponse.json({error:'MARKET_RULES_UNAVAILABLE'},{status:500})
 return NextResponse.json({version:'v1',markets:data??[]},{headers:{'Cache-Control':'public,max-age=300,s-maxage=300,stale-while-revalidate=1800'}})
}
