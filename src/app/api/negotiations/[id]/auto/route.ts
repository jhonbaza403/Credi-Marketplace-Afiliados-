import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

export async function POST(_:Request,context:{params:Promise<{id:string}>}){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {id}=await context.params
 const {data:n,error}=await supabase.from('negotiations').select('id,buyer_id,seller_id,state,currency,quantity,current_price,buyer_max_price,seller_min_price,rounds,auto_mode').eq('id',id).maybeSingle()
 if(error||!n)return json({error:'NEGOTIATION_NOT_FOUND'},404)
 const isBuyer=n.buyer_id===auth.user.id; if(!isBuyer&&n.seller_id!==auth.user.id)return json({error:'FORBIDDEN'},403)
 if(n.state!=='open')return json({error:'NEGOTIATION_CLOSED'},409)
 if(n.rounds>=8)return json({error:'AUTO_ROUND_LIMIT_REACHED'},409)
 const current=Number(n.current_price); const buyerMax=n.buyer_max_price===null?null:Number(n.buyer_max_price); const sellerMin=n.seller_min_price===null?null:Number(n.seller_min_price)
 let target=current
 if(isBuyer){
   const floor=sellerMin!==null?sellerMin:current*0.97
   const ceiling=buyerMax!==null?buyerMax:current
   target=current+(Math.min(floor,ceiling)-current)*0.5
   target=Math.max(0,Math.min(target,ceiling))
 } else {
   const ceiling=buyerMax!==null?buyerMax:current*1.03
   const floor=sellerMin!==null?sellerMin:current
   target=current+(Math.max(ceiling,floor)-current)*0.5
   if(sellerMin!==null)target=Math.max(target,sellerMin)
   if(buyerMax!==null)target=Math.min(target,buyerMax)
 }
 target=Math.round(target*100)/100
 if(Math.abs(target-current)<0.01)return json({ok:true,status:'no_material_move',negotiation:n})
 const {data:offer,error:offerError}=await supabase.from('negotiation_offers').insert({negotiation_id:id,actor_id:auth.user.id,actor_role:'agent',amount:target,currency:n.currency,quantity:n.quantity,strategy:isBuyer?'adaptive_buyer_concession':'adaptive_seller_concession',status:'proposed',terms:'Propuesta automática dentro de los límites autorizados.'}).select('id,amount,currency,quantity,strategy,status,created_at').single()
 if(offerError||!offer)return json({error:'AUTO_OFFER_FAILED'},500)
 const {data:updated,error:updateError}=await supabase.from('negotiations').update({current_price:target,rounds:Number(n.rounds)+1,auto_mode:true,updated_at:new Date().toISOString()}).eq('id',id).eq('state','open').select('id,current_price,rounds,auto_mode').single()
 if(updateError||!updated)return json({error:'AUTO_UPDATE_FAILED'},500)
 await supabase.from('agent_action_audit').insert({owner_id:auth.user.id,agent_name:'credi-ai-negotiator',action:'prepare_rfq_followup',resource_type:'negotiation',resource_id:id,authorization_level:'propose',status:'proposed',request_id:crypto.randomUUID(),input:{side:isBuyer?'buyer':'seller',round:n.rounds},output:{offer_id:offer.id,amount:target}})
 return json({ok:true,mode:'bounded_auto_negotiation',offer,negotiation:updated,requires_counterparty_confirmation:true},201)
}
