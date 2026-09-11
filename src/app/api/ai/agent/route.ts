import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCrediAgentAction, getAgentAuthorizationLevel } from '@/lib/ai/agent-permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})

export async function POST(request:Request){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'No autenticado'},401)
 let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{return json({error:'JSON inválido'},400)}
 const action=body.action; if(!isCrediAgentAction(action))return json({error:'ACCION_NO_PERMITIDA',allowed_actions:['inventory_summary','b2b_pipeline','prepare_rfq_followup','publish_offer','send_commercial_message','create_payment']},400)
 const level=getAgentAuthorizationLevel(action); const approved=body.approved===true; const requestId=crypto.randomUUID(); const admin=createAdminClient()
 const audit=async(status:string,input:Record<string,unknown>,output:Record<string,unknown>={})=>{await admin.from('agent_action_audit').insert({owner_id:auth.user.id,agent_name:'credi-ai',action,resource_type:typeof body.resource_type==='string'?body.resource_type:null,resource_id:typeof body.resource_id==='string'?body.resource_id:null,authorization_level:level,status,request_id:requestId,input,output})}
 await audit(level==='read'?'executing':approved?'authorized':'proposed',{action,approved})
 if(level!=='read'&&!approved)return json({ok:true,request_id:requestId,status:'approval_required',action,authorization_level:level,message:'La acción está preparada, pero requiere autorización explícita antes de ejecutarse.'},202)

 try{
  if(action==='inventory_summary'){
   const {data:store}=await supabase.from('stores').select('id').eq('vendor_id',auth.user.id).maybeSingle(); if(!store){const summary={products:0,active_products:0,stock:0,low_stock:0}; await audit('executed',{action},{summary}); return json({ok:true,action,request_id:requestId,summary})}
   const {data:products,error}=await supabase.from('products').select('stock,is_active').eq('store_id',store.id).limit(1000); if(error)throw error
   const rows=products??[]; const summary={products:rows.length,active_products:rows.filter((r)=>r.is_active).length,stock:rows.reduce((s,r)=>s+Math.max(0,Number(r.stock)),0),low_stock:rows.filter((r)=>Number(r.stock)>0&&Number(r.stock)<=5).length}; await audit('executed',{action},{summary}); return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='b2b_pipeline'){
   const [{count:openRfqs},{count:activeAutomations}]=await Promise.all([supabase.from('business_rfqs').select('id',{count:'exact',head:true}).eq('buyer_id',auth.user.id).in('status',['open','quoted']),supabase.from('business_automation_rules').select('id',{count:'exact',head:true}).eq('owner_id',auth.user.id).eq('enabled',true)]); const summary={open_rfqs:openRfqs??0,active_automations:activeAutomations??0}; await audit('executed',{action},{summary}); return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='create_payment'){
   const amount=Number(body.amount); const method=typeof body.method_type==='string'?body.method_type:'manual'; const currency=typeof body.currency==='string'?body.currency.toUpperCase():'USD'; if(!Number.isFinite(amount)||amount<=0)return json({error:'INVALID_AMOUNT',request_id:requestId},400)
   const {data:payment,error}=await supabase.from('payment_orchestrations').insert({user_id:auth.user.id,order_id:typeof body.order_id==='string'?body.order_id:null,amount,currency,method_type:method,provider:method,status:method==='manual'?'requires_action':'pending',client_reference:typeof body.client_reference==='string'?body.client_reference.slice(0,200):null,idempotency_key:`agent:${requestId}`,metadata:{agent:true,request_id:requestId},expires_at:new Date(Date.now()+30*60*1000).toISOString()}).select('id,status,method_type,amount,currency,expires_at').single(); if(error||!payment)throw error??new Error('payment')
   await audit('executed',{action,amount,method_type:method},{payment_id:payment.id}); return json({ok:true,action,request_id:requestId,status:'executed',payment})
  }
  if(action==='prepare_rfq_followup'){
   const rfqId=typeof body.resource_id==='string'?body.resource_id:null; if(!rfqId)return json({error:'RESOURCE_REQUIRED',request_id:requestId},400)
   const {data:rfq}=await supabase.from('business_rfqs').select('id,title,status,quantity,currency,needed_by').eq('id',rfqId).eq('buyer_id',auth.user.id).maybeSingle(); if(!rfq)return json({error:'RFQ_NOT_FOUND',request_id:requestId},404)
   const result={rfq,follow_up_message:`Seguimiento de RFQ: ${rfq.title}. Confirmar disponibilidad para ${rfq.quantity} unidades y fecha objetivo ${rfq.needed_by??'pendiente'}.`}; await audit('executed',{action,resource_id:rfqId},result); return json({ok:true,action,request_id:requestId,status:'executed',result})
  }
  await audit('executed',{action,approved},{message:'La acción está autorizada y registrada. El módulo de destino debe confirmar la operación específica.'}); return json({ok:true,action,request_id:requestId,status:'executed',authorization_level:level,message:'Acción autorizada y auditada.'})
 }catch(error){console.error('Agent action failed',{requestId,userId:auth.user.id,action,error}); await audit('failed',{action},{error:'operation_failed'}); return json({error:'AGENT_OPERATION_FAILED',request_id:requestId},500)}
}
