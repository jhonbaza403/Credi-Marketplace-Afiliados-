import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {id}=await context.params; let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{return json({error:'INVALID_JSON'},400)}
 const quoteId=typeof body.quote_id==='string'?body.quote_id:''; if(!quoteId)return json({error:'QUOTE_REQUIRED'},400)
 const admin=createAdminClient(); const {data:rfq}=await admin.from('business_rfqs').select('id,buyer_id,status').eq('id',id).maybeSingle()
 if(!rfq)return json({error:'RFQ_NOT_FOUND'},404); if(rfq.buyer_id!==auth.user.id)return json({error:'FORBIDDEN'},403); if(!['open','quoted'].includes(rfq.status))return json({error:'RFQ_NOT_OPEN'},409)
 const {data:quote}=await admin.from('business_rfq_quotes').select('id,rfq_id,supplier_id,store_id,unit_price,currency,min_order_quantity,lead_time_days,available_quantity,payment_terms,delivery_terms,notes,status').eq('id',quoteId).eq('rfq_id',id).maybeSingle()
 if(!quote)return json({error:'QUOTE_NOT_FOUND'},404); if(quote.status==='accepted')return json({ok:true,quote,already_accepted:true})
 const {error:quoteError}=await admin.from('business_rfq_quotes').update({status:'accepted',updated_at:new Date().toISOString()}).eq('id',quoteId).eq('rfq_id',id)
 if(quoteError)return json({error:'QUOTE_ACCEPT_FAILED'},500)
 const {error:otherError}=await admin.from('business_rfq_quotes').update({status:'rejected',updated_at:new Date().toISOString()}).eq('rfq_id',id).neq('id',quoteId).in('status',['submitted','accepted'])
 if(otherError)return json({error:'OTHER_QUOTES_UPDATE_FAILED'},500)
 const {error:rfqError}=await admin.from('business_rfqs').update({status:'closed',updated_at:new Date().toISOString()}).eq('id',id).eq('buyer_id',auth.user.id)
 if(rfqError)return json({error:'RFQ_CLOSE_FAILED'},500)
 return json({ok:true,rfq_id:id,selected_quote_id:quoteId,quote:{...quote,status:'accepted'},next_step:'create_negotiation_or_order'})
}
