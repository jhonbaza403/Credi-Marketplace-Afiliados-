import { NextResponse } from 'next/server'
import { createHash, createHmac } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentAuthorizationLevel, isCrediAgentAction } from '@/lib/ai/agent-permissions'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
const APPROVAL_TTL_MS=10*60*1000
const AGENT_MAX_PAYMENT_AMOUNT=Number(process.env.CREDI_AGENT_MAX_PAYMENT_AMOUNT||'1000')

function approvalSecret(){
 const secret=process.env.AGENT_APPROVAL_SECRET||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!secret)throw new Error('AGENT_APPROVAL_SECRET_NOT_CONFIGURED')
 return secret
}
function approvalToken(requestId:string,ownerId:string,action:string,resourceId:string|null,expiresAt:number){
 const payload=Buffer.from(JSON.stringify({requestId,ownerId,action,resourceId,expiresAt})).toString('base64url')
 const signature=createHmac('sha256',approvalSecret()).update(payload).digest('base64url')
 return `${payload}.${signature}`
}
function verifyApprovalToken(token:string,requestId:string,ownerId:string,action:string,resourceId:string|null){
 const [payload,signature]=token.split('.')
 if(!payload||!signature)return false
 const expected=createHmac('sha256',approvalSecret()).update(payload).digest('base64url')
 if(signature.length!==expected.length||!createHash('sha256').update(signature).digest().equals(createHash('sha256').update(expected).digest()))return false
 try{
  const parsed=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as {requestId:string;ownerId:string;action:string;resourceId:string|null;expiresAt:number}
  return parsed.requestId===requestId&&parsed.ownerId===ownerId&&parsed.action===action&&(parsed.resourceId??null)===(resourceId??null)&&Number.isFinite(parsed.expiresAt)&&parsed.expiresAt>Date.now()
 }catch{return false}
}

export async function POST(request:Request){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'No autenticado'},401)
 let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{return json({error:'JSON inválido'},400)}
 const action=body.action
 const allowed=['inventory_summary','b2b_pipeline','prepare_rfq_followup','publish_offer','send_commercial_message','create_payment']
 if(!isCrediAgentAction(action))return json({error:'ACCION_NO_PERMITIDA',allowed_actions:allowed},400)
 const level=getAgentAuthorizationLevel(action); const approved=body.approved===true; const admin=createAdminClient()
 const requestId=typeof body.request_id==='string'&&body.request_id.trim()?body.request_id.trim():crypto.randomUUID()
 const resourceId=typeof body.resource_id==='string'&&body.resource_id.trim()?body.resource_id.trim():null
 const audit=async(status:string,input:Record<string,unknown>,output:Record<string,unknown>={})=>{const result=await admin.from('agent_action_audit').insert({owner_id:auth.user.id,agent_name:'credi-ai',action,resource_type:typeof body.resource_type==='string'?body.resource_type:null,resource_id:resourceId,authorization_level:level,status,request_id:requestId,input,output});if(result.error)throw result.error}

 if(level==='read'){
  await audit('executing',{action},{})
 }else if(!approved){
  const expiresAt=Date.now()+APPROVAL_TTL_MS
  const token=approvalToken(requestId,auth.user.id,action,resourceId,expiresAt)
  const tokenHash=createHash('sha256').update(token).digest('hex')
  await audit('proposed',{action,approved:false},{approval_token_hash:tokenHash,approval_expires_at:new Date(expiresAt).toISOString()})
  return json({ok:true,request_id:requestId,status:'approval_required',action,authorization_level:level,approval_expires_at:new Date(expiresAt).toISOString(),approval_token:token,message:'La acción queda preparada. La autorización expira en 10 minutos y debe enviarse con el mismo request_id.'},202)
 }else{
  const token=typeof body.approval_token==='string'?body.approval_token:''
  if(!token||!verifyApprovalToken(token,requestId,auth.user.id,action,resourceId))return json({error:'APPROVAL_INVALID_OR_EXPIRED',request_id:requestId},403)
  const tokenHash=createHash('sha256').update(token).digest('hex')
  const {data:proposal}=await admin.from('agent_action_audit').select('id,status,output').eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).eq('status','proposed').maybeSingle()
  if(!proposal)return json({error:'APPROVAL_ALREADY_USED_OR_NOT_FOUND',request_id:requestId},409)
  const storedHash=typeof proposal.output?.approval_token_hash==='string'?proposal.output.approval_token_hash:''
  const storedExpiry=typeof proposal.output?.approval_expires_at==='string'?new Date(proposal.output.approval_expires_at).getTime():0
  if(storedHash!==tokenHash||storedExpiry<=Date.now())return json({error:'APPROVAL_INVALID_OR_EXPIRED',request_id:requestId},403)
  const {error:authorizationError}=await admin.from('agent_action_audit').update({status:'authorized',output:{approval_expires_at:proposal.output.approval_expires_at}}).eq('id',proposal.id).eq('status','proposed')
  if(authorizationError)return json({error:'APPROVAL_STATE_ERROR',request_id:requestId},500)
 }

 try{
  if(action==='inventory_summary'){
   const {data:store}=await supabase.from('stores').select('id').eq('vendor_id',auth.user.id).maybeSingle();
   if(!store){const summary={products:0,active_products:0,stock:0,low_stock:0}; await admin.from('agent_action_audit').update({status:'executed',output:{summary}}).eq('owner_id',auth.user.id).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,summary})}
   const {data:products,error}=await supabase.from('products').select('stock,is_active').eq('store_id',store.id).limit(1000); if(error)throw error
   const rows=products??[]; const summary={products:rows.length,active_products:rows.filter((r)=>r.is_active).length,stock:rows.reduce((s,r)=>s+Math.max(0,Number(r.stock)),0),low_stock:rows.filter((r)=>Number(r.stock)>0&&Number(r.stock)<=5).length}
   await admin.from('agent_action_audit').update({status:'executed',output:{summary}}).eq('owner_id',auth.user.id).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='b2b_pipeline'){
   const [{count:openRfqs},{count:activeAutomations}]=await Promise.all([supabase.from('business_rfqs').select('id',{count:'exact',head:true}).eq('buyer_id',auth.user.id).in('status',['open','quoted']),supabase.from('business_automation_rules').select('id',{count:'exact',head:true}).eq('owner_id',auth.user.id).eq('enabled',true)])
   const summary={open_rfqs:openRfqs??0,active_automations:activeAutomations??0}; await admin.from('agent_action_audit').update({status:'executed',output:{summary}}).eq('owner_id',auth.user.id).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='create_payment'){
   const amount=Number(body.amount); const method=typeof body.method_type==='string'?body.method_type:'manual'; const currency=typeof body.currency==='string'?body.currency.toUpperCase():'USD'
   if(!Number.isFinite(amount)||amount<=0)return json({error:'INVALID_AMOUNT',request_id:requestId},400)
   if(amount>AGENT_MAX_PAYMENT_AMOUNT)return json({error:'AGENT_PAYMENT_LIMIT_EXCEEDED',request_id:requestId,max_amount:AGENT_MAX_PAYMENT_AMOUNT},403)
   const {data:payment,error}=await supabase.from('payment_orchestrations').insert({user_id:auth.user.id,order_id:typeof body.order_id==='string'?body.order_id:null,amount,currency,method_type:method,provider:method,status:method==='manual'?'requires_action':'pending',client_reference:typeof body.client_reference==='string'?body.client_reference.slice(0,200):null,idempotency_key:`agent:${requestId}`,metadata:{agent:true,request_id:requestId},expires_at:new Date(Date.now()+30*60*1000).toISOString()}).select('id,status,method_type,amount,currency,expires_at').single()
   if(error||!payment)throw error??new Error('payment')
   await admin.from('agent_action_audit').update({status:'executed',output:{payment_id:payment.id}}).eq('owner_id',auth.user.id).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,status:'executed',requires_human_confirmation:true,payment})
  }
  if(action==='prepare_rfq_followup'){
   if(!resourceId)return json({error:'RESOURCE_REQUIRED',request_id:requestId},400)
   const {data:rfq}=await supabase.from('business_rfqs').select('id,title,status,quantity,currency,needed_by').eq('id',resourceId).eq('buyer_id',auth.user.id).maybeSingle(); if(!rfq)return json({error:'RFQ_NOT_FOUND',request_id:requestId},404)
   const result={rfq,follow_up_message:`Seguimiento de RFQ: ${rfq.title}. Confirmar disponibilidad para ${rfq.quantity} unidades y fecha objetivo ${rfq.needed_by??'pendiente'}.`}; await admin.from('agent_action_audit').update({status:'executed',output:result}).eq('owner_id',auth.user.id).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,status:'executed',result})
  }
  if(action==='publish_offer'){
   const title=typeof body.title==='string'?body.title.trim().slice(0,200):''; const price=Number(body.offer_price); const endsAt=typeof body.ends_at==='string'?body.ends_at:''
   if(!resourceId||!title||!Number.isFinite(price)||price<0||!endsAt)return json({error:'LISTING_TITLE_PRICE_ENDS_AT_REQUIRED',request_id:requestId},400)
   const {data:listing}=await supabase.from('listings').select('id,seller_id,title,price_amount,currency,status').eq('id',resourceId).eq('seller_id',auth.user.id).maybeSingle(); if(!listing)return json({error:'LISTING_NOT_FOUND',request_id:requestId},404)
   const {data:offer,error}=await supabase.from('listing_offers').insert({listing_id:resourceId,seller_id:auth.user.id,title,offer_price:price,currency:listing.currency,original_price:listing.price_amount,starts_at:new Date().toISOString(),ends_at:endsAt,status:'active',max_quantity:body.max_quantity==null?null:Number(body.max_quantity),terms:typeof body.terms==='string'?body.terms.slice(0,1000):null}).select('id,listing_id,title,offer_price,currency,starts_at,ends_at,status,max_quantity,terms').single()
   if(error||!offer)throw error??new Error('offer')
   await admin.from('agent_action_audit').update({status:'executed',output:{offer_id:offer.id}}).eq('owner_id',auth.user.id).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,status:'executed',offer})
  }
  if(action==='send_commercial_message'){
   const message=typeof body.message==='string'?body.message.trim().slice(0,4000):''
   if(!resourceId||!message)return json({error:'CONVERSATION_AND_MESSAGE_REQUIRED',request_id:requestId},400)
   const {data:member}=await supabase.from('conversation_members').select('conversation_id').eq('conversation_id',resourceId).eq('user_id',auth.user.id).maybeSingle(); if(!member)return json({error:'CONVERSATION_ACCESS_DENIED',request_id:requestId},403)
   const {data:created,error}=await supabase.from('messages').insert({conversation_id:resourceId,sender_id:auth.user.id,message_type:'text',body:message,metadata:{source:'credi-ai-agent',request_id:requestId}}).select('id,conversation_id,sender_id,message_type,body,created_at').single()
   if(error||!created)throw error??new Error('message')
   await admin.from('agent_action_audit').update({status:'executed',output:{message_id:created.id}}).eq('owner_id',auth.user.id).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,status:'executed',message:created})
  }
  await admin.from('agent_action_audit').update({status:'executed',output:{message:'Acción autorizada y ejecutada.'}}).eq('owner_id',auth.user.id).eq('request_id',requestId).in('status',['executing','authorized'])
  return json({ok:true,action,request_id:requestId,status:'executed',authorization_level:level,message:'Acción autorizada y auditada.'})
 }catch(error){
  console.error('Agent action failed',{requestId,userId:auth.user.id,action,error})
  await admin.from('agent_action_audit').update({status:'failed',output:{error:'operation_failed'}}).eq('owner_id',auth.user.id).eq('request_id',requestId).in('status',['executing','authorized'])
  return json({error:'AGENT_OPERATION_FAILED',request_id:requestId},500)
 }
}
