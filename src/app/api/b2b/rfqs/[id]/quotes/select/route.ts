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
 const admin=createAdminClient(); const {data:rfq}=await admin.from('business_rfqs').select('id,buyer_id,status,quantity,currency').eq('id',id).maybeSingle()
 if(!rfq)return json({error:'RFQ_NOT_FOUND'},404); if(rfq.buyer_id!==auth.user.id)return json({error:'FORBIDDEN'},403); if(!['open','quoted'].includes(rfq.status))return json({error:'RFQ_NOT_OPEN'},409)
 const {data:quote}=await admin.from('business_rfq_quotes').select('id,rfq_id,supplier_id,store_id,product_id,unit_price,currency,min_order_quantity,lead_time_days,available_quantity,payment_terms,delivery_terms,notes,status').eq('id',quoteId).eq('rfq_id',id).maybeSingle()
 if(!quote)return json({error:'QUOTE_NOT_FOUND'},404)
 const {data:existingAward}=await admin.from('b2b_awards').select('id,status,negotiation_id,order_id').eq('rfq_id',id).eq('quote_id',quoteId).maybeSingle(); if(existingAward)return json({ok:true,award:existingAward,already_awarded:true})
 const {error:qErr}=await admin.from('business_rfq_quotes').update({status:'accepted',updated_at:new Date().toISOString()}).eq('id',quoteId).eq('rfq_id',id); if(qErr)return json({error:'QUOTE_ACCEPT_FAILED'},500)
 const {error:oErr}=await admin.from('business_rfq_quotes').update({status:'rejected',updated_at:new Date().toISOString()}).eq('rfq_id',id).neq('id',quoteId).in('status',['submitted','shortlisted']); if(oErr)return json({error:'OTHER_QUOTES_UPDATE_FAILED'},500)
 const {error:rErr}=await admin.from('business_rfqs').update({status:'closed',updated_at:new Date().toISOString()}).eq('id',id).eq('buyer_id',auth.user.id); if(rErr)return json({error:'RFQ_CLOSE_FAILED'},500)
 const {data:award,error:awardErr}=await admin.from('b2b_awards').insert({rfq_id:id,quote_id:quoteId,buyer_id:auth.user.id,supplier_id:quote.supplier_id,store_id:quote.store_id,status:'awarded'}).select('id,rfq_id,quote_id,buyer_id,supplier_id,store_id,status,created_at').single(); if(awardErr||!award)return json({error:'AWARD_CREATE_FAILED'},500)
 const {data:neg,error:negErr}=await admin.from('negotiations').insert({rfq_id:id,buyer_id:auth.user.id,seller_id:quote.supplier_id,currency:quote.currency,current_price:Number(quote.unit_price),quantity:Number(rfq.quantity),buyer_max_price:null,seller_min_price:Number(quote.unit_price),auto_mode:false,metadata:{source:'rfq-award',award_id:award.id}}).select('id,rfq_id,buyer_id,seller_id,state,currency,quantity,current_price,rounds,auto_mode,created_at').single()
 if(negErr||!neg)return json({ok:true,award,next_step:'negotiation',warning:'NEGOTIATION_CREATE_FAILED'},201)
 const {error:offerErr}=await admin.from('negotiation_offers').insert({negotiation_id:neg.id,actor_id:auth.user.id,actor_role:'buyer',amount:Number(quote.unit_price),currency:quote.currency,quantity:Number(rfq.quantity),strategy:'rfq_award'}); if(offerErr)console.error('Initial award offer failed',offerErr)
 await admin.from('b2b_awards').update({status:'negotiating',negotiation_id:neg.id,updated_at:new Date().toISOString()}).eq('id',award.id)
 return json({ok:true,award:{...award,status:'negotiating',negotiation_id:neg.id},negotiation:neg,next_step:quote.product_id?'order_ready':'supplier_product_required'},201)
}
