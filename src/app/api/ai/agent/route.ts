import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { hashAgentApprovalInput, signAgentApprovalToken, verifyAgentApprovalToken } from '@/lib/ai/agent-approval'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentAuthorizationLevel, isCrediAgentAction } from '@/lib/ai/agent-permissions'
import { distributedRateLimit } from '@/lib/security/rate-limit'
import { getRequestIp } from '@/lib/security/auth'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const MAX_BODY_SIZE=32_768

const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
const APPROVAL_TTL_MS=10*60*1000
const AGENT_MAX_PAYMENT_AMOUNT=Number(process.env.CREDI_AGENT_MAX_PAYMENT_AMOUNT||'1000')

function approvalSecret(){
 const secret=process.env.AGENT_APPROVAL_SECRET||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!secret)throw new Error('AGENT_APPROVAL_SECRET_NOT_CONFIGURED')
 return secret
}


export async function POST(request:Request){
 if(!isSameOrigin(request))return json({error:'Origen no autorizado'},403)
 const contentType=request.headers.get('content-type')??''
 if(!contentType.toLowerCase().includes('application/json'))return json({error:'JSON requerido'},415)
 const contentLength=request.headers.get('content-length')
 if(contentLength&&Number.isFinite(Number(contentLength))&&Number(contentLength)>MAX_BODY_SIZE)return json({error:'Solicitud demasiado grande'},413)
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'No autenticado'},401)
 const limit=await distributedRateLimit(supabase,`ai-agent:${auth.user.id}:${getRequestIp(request)}`,{limit:30,windowMs:60_000})
 if(!limit.success)return json({error:'RATE_LIMITED'},429)
 let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{return json({error:'JSON inválido'},400)}
 const action=body.action
 const allowed=['inventory_summary','b2b_pipeline','prepare_rfq_followup','publish_offer','send_commercial_message','create_payment','commerce_summary','affiliate_summary','chat_summary','live_summary','social_summary','support_summary','create_support_case','create_b2b_rfq','create_social_post','orders_summary','wallet_summary','marketing_summary','create_marketing_campaign','pay_order_from_wallet']
 if(!isCrediAgentAction(action))return json({error:'ACCION_NO_PERMITIDA',allowed_actions:allowed},400)
 const level=getAgentAuthorizationLevel(action); const approved=body.approved===true; const admin=createAdminClient()
 const requestId=typeof body.request_id==='string'&&body.request_id.trim()?body.request_id.trim():crypto.randomUUID()
 const resourceId=typeof body.resource_id==='string'&&body.resource_id.trim()?body.resource_id.trim():null
 const audit=async(status:string,input:Record<string,unknown>,output:Record<string,unknown>={})=>{const result=await admin.from('agent_action_audit').insert({owner_id:auth.user.id,agent_name:'credi-ai',action,resource_type:typeof body.resource_type==='string'?body.resource_type:null,resource_id:resourceId,authorization_level:level,status,request_id:requestId,input,output});if(result.error)throw result.error}
 const markExecuted=async(output:Record<string,unknown>)=>{const result=await admin.from('agent_action_audit').update({status:'executed',output}).eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).in('status',['executing','authorized']);if(result.error)throw result.error}

 if(level==='read'){
  await audit('executing',{action},{})
 }else if(!approved){
  const expiresAt=Date.now()+APPROVAL_TTL_MS
  const inputHash=hashAgentApprovalInput(body)
  const token=signAgentApprovalToken({requestId,ownerId:auth.user.id,action,resourceId,inputHash,expiresAt},approvalSecret())
  const tokenHash=createHash('sha256').update(token).digest('hex')
  await audit('proposed',{action,resource_id:resourceId},{approval_token_hash:tokenHash,approval_payload_hash:inputHash,approval_expires_at:new Date(expiresAt).toISOString()})
  return json({ok:true,request_id:requestId,status:'approval_required',action,authorization_level:level,approval_expires_at:new Date(expiresAt).toISOString(),approval_token:token,message:'La acción queda preparada. La autorización expira en 10 minutos y solo permite ejecutar exactamente los datos revisados.'},202)
 }else{
  const inputHash=hashAgentApprovalInput(body)
  const token=typeof body.approval_token==='string'?body.approval_token:''
  if(!token||!verifyAgentApprovalToken(token,{requestId,ownerId:auth.user.id,action,resourceId,inputHash},approvalSecret()))return json({error:'APPROVAL_INVALID_OR_EXPIRED_OR_PAYLOAD_CHANGED',request_id:requestId},403)
  const tokenHash=createHash('sha256').update(token).digest('hex')
  const {data:proposal}=await admin.from('agent_action_audit').select('id,status,output').eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).eq('status','proposed').maybeSingle()
  if(!proposal)return json({error:'APPROVAL_ALREADY_USED_OR_NOT_FOUND',request_id:requestId},409)
  const storedHash=typeof proposal.output?.approval_token_hash==='string'?proposal.output.approval_token_hash:''
  const storedPayloadHash=typeof proposal.output?.approval_payload_hash==='string'?proposal.output.approval_payload_hash:''
  const storedExpiry=typeof proposal.output?.approval_expires_at==='string'?new Date(proposal.output.approval_expires_at).getTime():0
  if(storedHash!==tokenHash||storedPayloadHash!==inputHash||storedExpiry<=Date.now())return json({error:'APPROVAL_INVALID_OR_EXPIRED_OR_PAYLOAD_CHANGED',request_id:requestId},403)
  const {data:authorizedProposal,error:authorizationError}=await admin.from('agent_action_audit').update({status:'authorized',output:{approval_expires_at:proposal.output.approval_expires_at}}).eq('id',proposal.id).eq('owner_id',auth.user.id).eq('status','proposed').select('id').maybeSingle()
  if(authorizationError)return json({error:'APPROVAL_STATE_ERROR',request_id:requestId},500)
  if(!authorizedProposal)return json({error:'APPROVAL_ALREADY_USED_OR_NOT_FOUND',request_id:requestId},409)
 }

 try{
  if(action==='inventory_summary'){
   const {data:store}=await supabase.from('stores').select('id').eq('vendor_id',auth.user.id).maybeSingle();
   if(!store){const summary={products:0,active_products:0,stock:0,low_stock:0}; await admin.from('agent_action_audit').update({status:'executed',output:{summary}}).eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,summary})}
   const {data:products,error}=await supabase.from('products').select('stock,is_active').eq('store_id',store.id).limit(1000); if(error)throw error
   const rows=products??[]; const summary={products:rows.length,active_products:rows.filter((r)=>r.is_active).length,stock:rows.reduce((s,r)=>s+Math.max(0,Number(r.stock)),0),low_stock:rows.filter((r)=>Number(r.stock)>0&&Number(r.stock)<=5).length}
   await admin.from('agent_action_audit').update({status:'executed',output:{summary}}).eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='b2b_pipeline'){
   const [{count:openRfqs},{count:activeAutomations}]=await Promise.all([supabase.from('business_rfqs').select('id',{count:'exact',head:true}).eq('buyer_id',auth.user.id).in('status',['open','quoted']),supabase.from('business_automation_rules').select('id',{count:'exact',head:true}).eq('owner_id',auth.user.id).eq('enabled',true)])
   const summary={open_rfqs:openRfqs??0,active_automations:activeAutomations??0}; await admin.from('agent_action_audit').update({status:'executed',output:{summary}}).eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='commerce_summary'){
   const {data:store,error:storeError}=await supabase.from('stores').select('id,store_name').eq('vendor_id',auth.user.id).maybeSingle()
   if(storeError)throw storeError
   if(!store){const summary={store:null,products:0,active_products:0,units_in_stock:0,low_stock_products:0};await markExecuted({summary});return json({ok:true,action,request_id:requestId,summary})}
   const {data:products,error}=await supabase.from('products').select('id,stock,is_active').eq('store_id',store.id).limit(2000)
   if(error)throw error
   const rows=products??[]
   const summary={store:store.store_name,products:rows.length,active_products:rows.filter((row)=>row.is_active).length,units_in_stock:rows.reduce((sum,row)=>sum+Math.max(0,Number(row.stock)||0),0),low_stock_products:rows.filter((row)=>Number(row.stock)>0&&Number(row.stock)<=5).length}
   await markExecuted({summary})
   return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='affiliate_summary'){
   const {data:affiliate,error:affiliateError}=await supabase.from('affiliates').select('id,code,is_active,commission_rate').eq('user_id',auth.user.id).limit(1).maybeSingle()
   if(affiliateError)throw affiliateError
   if(!affiliate){const summary={enrolled:false,active_links:0,total_links:0,tracked_clicks:0,tracked_conversions:0,commission_balances:'not_exposed_by_affiliate_ledger_policy'};await markExecuted({summary});return json({ok:true,action,request_id:requestId,summary})}
   const {data:links,error}=await supabase.from('affiliate_product_links').select('id,clicks,conversions,is_active').eq('affiliate_id',affiliate.id).limit(2000)
   if(error)throw error
   const rows=links??[]
   const summary={enrolled:true,affiliate_code:affiliate.code,active:affiliate.is_active,base_commission_rate:Number(affiliate.commission_rate),total_links:rows.length,active_links:rows.filter((row)=>row.is_active).length,tracked_clicks:rows.reduce((sum,row)=>sum+Number(row.clicks||0),0),tracked_conversions:rows.reduce((sum,row)=>sum+Number(row.conversions||0),0),commission_balances:'not_exposed_by_affiliate_ledger_policy'}
   await markExecuted({summary})
   return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='chat_summary'){
   const {data:members,error:membersError}=await supabase.from('conversation_members').select('conversation_id,member_role').eq('user_id',auth.user.id).limit(500)
   if(membersError)throw membersError
   const ids=[...new Set((members??[]).map((row)=>row.conversation_id))]
   let recentMessages=0
   if(ids.length){const {count,error}=await supabase.from('messages').select('id',{count:'exact',head:true}).in('conversation_id',ids).gte('created_at',new Date(Date.now()-30*86400000).toISOString());if(error)throw error;recentMessages=count??0}
   const summary={conversations:ids.length,admin_or_support_memberships:(members??[]).filter((row)=>['admin','support'].includes(row.member_role)).length,messages_last_30_days:recentMessages,group_channel_creation:'not_enabled_until_membership_policy_is_hardened'}
   await markExecuted({summary})
   return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='live_summary'){
   const {data:rooms,error}=await supabase.from('chat_live_rooms').select('id,status,viewer_count,replay_url,scheduled_at').eq('host_user_id',auth.user.id).order('created_at',{ascending:false}).limit(500)
   if(error)throw error
   const rows=rooms??[]
   const summary={rooms:rows.length,live_now:rows.filter((row)=>row.status==='live').length,scheduled:rows.filter((row)=>row.status==='scheduled'||Boolean(row.scheduled_at&&row.status!=='live')).length,ended:rows.filter((row)=>row.status==='ended'||Boolean(row.replay_url)).length,replays_available:rows.filter((row)=>Boolean(row.replay_url)).length,viewers_now:rows.filter((row)=>row.status==='live').reduce((sum,row)=>sum+Number(row.viewer_count||0),0),transport_verification:'not_verified_by_summary_query'}
   await markExecuted({summary})
   return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='social_summary'){
   const [{count:posts,error:postsError},{count:stories,error:storiesError},{count:reels,error:reelsError}]=await Promise.all([
    supabase.from('feed_posts').select('id',{count:'exact',head:true}).eq('owner_id',auth.user.id),
    supabase.from('stories').select('id',{count:'exact',head:true}).eq('owner_id',auth.user.id),
    supabase.from('reels').select('id',{count:'exact',head:true}).eq('owner_id',auth.user.id),
   ])
   if(postsError)throw postsError
   if(storiesError)throw storiesError
   if(reelsError)throw reelsError
   const summary={posts:posts??0,stories:stories??0,reels:reels??0,publication_moderation:'moderation_status_is_preserved; AI cannot self-approve content'}
   await markExecuted({summary})
   return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='support_summary'){
   const {data:cases,error}=await supabase.from('support_cases').select('id,status,priority,created_at').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(500)
   if(error)throw error
   const rows=cases??[]
   const summary={total:rows.length,open:rows.filter((row)=>!['resolved','not_planned'].includes(row.status)).length,critical:rows.filter((row)=>row.priority==='critical'&&!['resolved','not_planned'].includes(row.status)).length,by_status:rows.reduce((result,row)=>{result[row.status]=(result[row.status]??0)+1;return result},{} as Record<string,number>)}
   await markExecuted({summary})
   return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='create_support_case'){
   const title=typeof body.title==='string'?body.title.trim(): ''
   const description=typeof body.description==='string'?body.description.trim(): ''
   const categories=['account','orders','payments','products','chat','affiliate','b2b','live','security','technical','suggestion','other']
   const category=typeof body.category==='string'?body.category:'other'
   if(title.length<5||title.length>180||description.length<10||description.length>10000||!categories.includes(category))return json({error:'INVALID_SUPPORT_CASE_INPUT',request_id:requestId},400)
   const {data:created,error}=await supabase.from('support_cases').insert({user_id:auth.user.id,source:'support',category,title,description}).select('id,reference_code,category,title,status,priority,created_at').single()
   if(error||!created)throw error??new Error('SUPPORT_CASE_CREATE_FAILED')
   const {error:eventError}=await supabase.from('support_case_events').insert({case_id:created.id,actor_id:auth.user.id,event_type:'created',body:'Caso creado desde Credi AI a solicitud del usuario.',visibility:'user',metadata:{request_id:requestId,source:'credi-ai'}})
   await markExecuted({case_id:created.id,reference_code:created.reference_code,timeline_recorded:!eventError})
   return json({ok:true,action,request_id:requestId,status:'executed',case:created,timeline_recorded:!eventError},201)
  }
  if(action==='create_b2b_rfq'){
   const title=typeof body.title==='string'?body.title.trim():''
   const description=typeof body.description==='string'?body.description.trim():''
   const quantity=Number(body.quantity)
   const currency=typeof body.currency==='string'?body.currency.trim().toUpperCase():'USD'
   const targetPrice=body.target_unit_price==null||body.target_unit_price===''?null:Number(body.target_unit_price)
   const country=typeof body.delivery_country==='string'?body.delivery_country.trim().toUpperCase():null
   const neededBy=typeof body.needed_by==='string'&&body.needed_by.trim()?body.needed_by.trim():null
   if(title.length<3||title.length>300||description.length<10||description.length>12000||!Number.isFinite(quantity)||quantity<=0||!/^[A-Z]{3}$/.test(currency)||(targetPrice!==null&&(!Number.isFinite(targetPrice)||targetPrice<0))||(country!==null&&!/^[A-Z]{2}$/.test(country))||(neededBy!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(neededBy)))return json({error:'INVALID_B2B_RFQ_INPUT',request_id:requestId},400)
   const {data:rfq,error}=await supabase.from('business_rfqs').insert({buyer_id:auth.user.id,title,description,quantity,currency,target_unit_price:targetPrice,delivery_country:country,needed_by:neededBy,status:'open',visibility:'network',metadata:{created_by:'credi-ai',request_id:requestId}}).select('id,title,description,quantity,currency,target_unit_price,delivery_country,needed_by,status,created_at').single()
   if(error||!rfq)throw error??new Error('B2B_RFQ_CREATE_FAILED')
   await markExecuted({rfq_id:rfq.id,status:rfq.status})
   return json({ok:true,action,request_id:requestId,status:'executed',rfq},201)
  }
  if(action==='create_social_post'){
   const title=typeof body.title==='string'?body.title.trim().slice(0,200):''
   const postBody=typeof body.body==='string'?body.body.trim():''
   const visibility=body.visibility==='private'?'private':'public'
   if(postBody.length<1||postBody.length>10000)return json({error:'INVALID_SOCIAL_POST_BODY',request_id:requestId},400)
   const {data:post,error}=await supabase.from('feed_posts').insert({owner_id:auth.user.id,title,body:postBody,visibility,status:'published',operation_context:{source:'credi-ai',request_id:requestId}}).select('id,title,body,visibility,status,moderation_status,created_at').single()
   if(error||!post)throw error??new Error('SOCIAL_POST_CREATE_FAILED')
   await markExecuted({post_id:post.id,moderation_status:post.moderation_status})
   return json({ok:true,action,request_id:requestId,status:'executed',publication:post,publicly_visible:post.moderation_status==='approved',message:post.moderation_status==='approved'?'Publicación aprobada y visible.':'Publicación creada y enviada al flujo de moderación; todavía no es visible públicamente.'},201)
  }
  if(action==='orders_summary'){
   const {data:orders,error}=await supabase.from('orders').select('id,status,total_amount,currency,payment_status,created_at').eq('buyer_id',auth.user.id).order('created_at',{ascending:false}).limit(1000)
   if(error)throw error
   const rows=orders??[]
   const byStatus=rows.reduce((result,row)=>{result[String(row.status)]=(result[String(row.status)]??0)+1;return result},{} as Record<string,number>)
   const pendingByCurrency=rows.filter((row)=>row.payment_status==='pending').reduce((result,row)=>{const code=String(row.currency||'USD').trim();result[code]=(result[code]??0)+Number(row.total_amount||0);return result},{} as Record<string,number>)
   const summary={orders:rows.length,by_status:byStatus,pending_payment_totals_by_currency:Object.entries(pendingByCurrency).map(([currency,amount])=>({currency,amount:Number(amount.toFixed(2))}))}
   await markExecuted({summary})
   return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='wallet_summary'){
   const {data:accounts,error}=await supabase.from('wallet_accounts').select('id,currency,available_balance,pending_balance,status').eq('user_id',auth.user.id).order('currency',{ascending:true}).limit(100)
   if(error)throw error
   const summary={accounts:(accounts??[]).map((account)=>({id:account.id,currency:String(account.currency).trim(),available_balance:Number(account.available_balance),pending_balance:Number(account.pending_balance),status:account.status})),currency_note:'Los saldos se muestran separados por moneda; no se suman monedas diferentes.'}
   await markExecuted({summary})
   return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='marketing_summary'){
   const {data:campaigns,error}=await supabase.from('marketing_campaigns').select('id,name,objective,status,currency,daily_budget,lifetime_budget,start_at,end_at').eq('owner_id',auth.user.id).order('created_at',{ascending:false}).limit(500)
   if(error)throw error
   const rows=campaigns??[]
   const byStatus=rows.reduce((result,row)=>{result[row.status]=(result[row.status]??0)+1;return result},{} as Record<string,number>)
   const dailyBudgets=rows.reduce((result,row)=>{const code=String(row.currency||'USD');result[code]=(result[code]??0)+Number(row.daily_budget||0);return result},{} as Record<string,number>)
   const summary={campaigns:rows.length,by_status:byStatus,daily_budget_totals_by_currency:Object.entries(dailyBudgets).map(([currency,amount])=>({currency,amount:Number(amount.toFixed(2))})),active_campaigns:rows.filter((row)=>row.status==='active').length}
   await markExecuted({summary})
   return json({ok:true,action,request_id:requestId,summary})
  }
  if(action==='create_marketing_campaign'){
   const name=typeof body.name==='string'?body.name.trim():''
   const objective=typeof body.objective==='string'?body.objective:'sales'
   const allowedObjectives=['awareness','traffic','engagement','leads','sales','catalog','live_attendance']
   const currency=typeof body.currency==='string'?body.currency.trim().toUpperCase():'USD'
   const dailyBudget=body.daily_budget==null?0:Number(body.daily_budget)
   const lifetimeBudget=body.lifetime_budget==null||body.lifetime_budget===''?null:Number(body.lifetime_budget)
   if(name.length<2||name.length>180||!allowedObjectives.includes(objective)||!/^[A-Z]{3}$/.test(currency)||!Number.isFinite(dailyBudget)||dailyBudget<0||(lifetimeBudget!==null&&(!Number.isFinite(lifetimeBudget)||lifetimeBudget<0)))return json({error:'INVALID_MARKETING_CAMPAIGN_INPUT',request_id:requestId},400)
   const {data:campaign,error}=await supabase.from('marketing_campaigns').insert({owner_id:auth.user.id,name,objective,currency,daily_budget:dailyBudget,lifetime_budget:lifetimeBudget,status:'draft'}).select('id,name,objective,status,currency,daily_budget,lifetime_budget,created_at').single()
   if(error||!campaign)throw error??new Error('MARKETING_CAMPAIGN_CREATE_FAILED')
   await markExecuted({campaign_id:campaign.id,status:'draft',budget_is_not_spent:true})
   return json({ok:true,action,request_id:requestId,status:'executed',campaign,launch_requires_separate_approval:true,message:'Borrador creado; no se ha activado ni consumido presupuesto.'},201)
  }
  if(action==='pay_order_from_wallet'){
   if(!resourceId)return json({error:'ORDER_ID_REQUIRED',request_id:requestId},400)
   const idempotencyKey=`credi-ai:${createHash('sha256').update(requestId).digest('hex')}`
   const {data:paymentResult,error}=await supabase.rpc('wallet_pay_order',{p_order_id:resourceId,p_idempotency_key:idempotencyKey})
   if(error){
    const message=String(error.message||'')
    if(message.includes('INSUFFICIENT_FUNDS'))return json({error:'INSUFFICIENT_WALLET_FUNDS',request_id:requestId},409)
    if(message.includes('ORDER_NOT_FOUND'))return json({error:'ORDER_NOT_FOUND',request_id:requestId},404)
    if(message.includes('ORDER_NOT_PAYABLE'))return json({error:'ORDER_NOT_PAYABLE',request_id:requestId},409)
    if(message.includes('WALLET_NOT_ACTIVE'))return json({error:'WALLET_NOT_ACTIVE',request_id:requestId},409)
    if(message.includes('PLATFORM_REVENUE_ACCOUNT_NOT_CONFIGURED'))return json({error:'PLATFORM_WALLET_NOT_CONFIGURED',request_id:requestId},409)
    throw error
   }
   const result=paymentResult&&typeof paymentResult==='object'?paymentResult as Record<string,unknown>:{result:paymentResult}
   await markExecuted({payment:result,provider:'wallet',idempotency_key:idempotencyKey})
   return json({ok:true,action,request_id:requestId,status:result.status==='succeeded'?'executed':'submitted',payment:result,message:result.status==='succeeded'?'El pago con billetera fue confirmado por la transacción contable de Credi.':'La billetera devolvió un estado que requiere revisión.'})
  }
  if(action==='create_payment'){
   if(!resourceId)return json({error:'ORDER_ID_REQUIRED',request_id:requestId},400)
   const method=typeof body.method_type==='string'?body.method_type.trim().toLowerCase():'manual'
   const allowedMethods=['stripe','crypto','bank_transfer','wallet','manual']
   if(!allowedMethods.includes(method))return json({error:'INVALID_PAYMENT_METHOD',request_id:requestId},400)
   const {data:order,error:orderError}=await supabase.from('orders').select('id,buyer_id,total_amount,currency,status').eq('id',resourceId).eq('buyer_id',auth.user.id).maybeSingle()
   if(orderError)throw orderError
   if(!order)return json({error:'ORDER_NOT_FOUND',request_id:requestId},404)
   if(order.status!=='pending')return json({error:'ORDER_NOT_PAYABLE',request_id:requestId},409)
   const amount=Number(order.total_amount)
   const currency=typeof order.currency==='string'?order.currency.toUpperCase():''
   if(!Number.isFinite(amount)||amount<=0||!/^[A-Z]{3}$/.test(currency))return json({error:'INVALID_ORDER_TOTAL',request_id:requestId},409)
   const {data:items,error:itemsError}=await supabase.from('order_items').select('quantity,unit_price,subtotal').eq('order_id',order.id)
   if(itemsError||!items?.length)return json({error:'ORDER_ITEMS_UNAVAILABLE',request_id:requestId},409)
   const itemTotal=items.reduce((sum,r)=>sum+Number(r.subtotal),0)
   if(!Number.isFinite(itemTotal)||Math.round(itemTotal*100)!==Math.round(amount*100))return json({error:'ORDER_TOTAL_MISMATCH',request_id:requestId},409)
   if(amount>AGENT_MAX_PAYMENT_AMOUNT)return json({error:'AGENT_PAYMENT_LIMIT_EXCEEDED',request_id:requestId,max_amount:AGENT_MAX_PAYMENT_AMOUNT},403)
   const {data:payment,error}=await supabase.from('payment_orchestrations').insert({user_id:auth.user.id,order_id:order.id,amount,currency,method_type:method,provider:method,status:method==='manual'?'requires_action':'pending',client_reference:order.id,idempotency_key:`agent:${requestId}`,metadata:{agent:true,request_id:requestId,server_derived_amount:true},expires_at:new Date(Date.now()+30*60*1000).toISOString()}).select('id,status,method_type,amount,currency,expires_at').single()
   if(error||!payment)throw error??new Error('payment')
   await admin.from('agent_action_audit').update({status:'executed',output:{payment_id:payment.id,server_derived_amount:true}}).eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,status:'executed',requires_human_confirmation:true,payment})
  }
  if(action==='prepare_rfq_followup'){
   if(!resourceId)return json({error:'RESOURCE_REQUIRED',request_id:requestId},400)
   const {data:rfq}=await supabase.from('business_rfqs').select('id,title,status,quantity,currency,needed_by').eq('id',resourceId).eq('buyer_id',auth.user.id).maybeSingle(); if(!rfq)return json({error:'RFQ_NOT_FOUND',request_id:requestId},404)
   const result={rfq,follow_up_message:`Seguimiento de RFQ: ${rfq.title}. Confirmar disponibilidad para ${rfq.quantity} unidades y fecha objetivo ${rfq.needed_by??'pendiente'}.`}; await admin.from('agent_action_audit').update({status:'executed',output:result}).eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,status:'executed',result})
  }
  if(action==='publish_offer'){
   const title=typeof body.title==='string'?body.title.trim().slice(0,200):''; const price=Number(body.offer_price); const endsAt=typeof body.ends_at==='string'?body.ends_at:''
   if(!resourceId||!title||!Number.isFinite(price)||price<0||!endsAt)return json({error:'LISTING_TITLE_PRICE_ENDS_AT_REQUIRED',request_id:requestId},400)
   const {data:listing}=await supabase.from('listings').select('id,seller_id,title,price_amount,currency,status').eq('id',resourceId).eq('seller_id',auth.user.id).maybeSingle(); if(!listing)return json({error:'LISTING_NOT_FOUND',request_id:requestId},404)
   const {data:offer,error}=await supabase.from('listing_offers').insert({listing_id:resourceId,seller_id:auth.user.id,title,offer_price:price,currency:listing.currency,original_price:listing.price_amount,starts_at:new Date().toISOString(),ends_at:endsAt,status:'active',max_quantity:body.max_quantity==null?null:Number(body.max_quantity),terms:typeof body.terms==='string'?body.terms.slice(0,1000):null}).select('id,listing_id,title,offer_price,currency,starts_at,ends_at,status,max_quantity,terms').single()
   if(error||!offer)throw error??new Error('offer')
   await admin.from('agent_action_audit').update({status:'executed',output:{offer_id:offer.id}}).eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,status:'executed',offer})
  }
  if(action==='send_commercial_message'){
   const message=typeof body.message==='string'?body.message.trim().slice(0,4000):''
   if(!resourceId||!message)return json({error:'CONVERSATION_AND_MESSAGE_REQUIRED',request_id:requestId},400)
   const {data:member}=await supabase.from('conversation_members').select('conversation_id').eq('conversation_id',resourceId).eq('user_id',auth.user.id).maybeSingle(); if(!member)return json({error:'CONVERSATION_ACCESS_DENIED',request_id:requestId},403)
   const {data:created,error}=await supabase.from('messages').insert({conversation_id:resourceId,sender_id:auth.user.id,message_type:'text',body:message,metadata:{source:'credi-ai-agent',request_id:requestId}}).select('id,conversation_id,sender_id,message_type,body,created_at').single()
   if(error||!created)throw error??new Error('message')
   await admin.from('agent_action_audit').update({status:'executed',output:{message_id:created.id}}).eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).in('status',['executing','authorized']); return json({ok:true,action,request_id:requestId,status:'executed',message:created})
  }
  throw new Error(`UNIMPLEMENTED_AGENT_ACTION:${String(action)}`)
 }catch(error){
  console.error('Agent action failed',{requestId,userId:auth.user.id,action,error})
  await admin.from('agent_action_audit').update({status:'failed',output:{error:'operation_failed'}}).eq('owner_id',auth.user.id).eq('action',action).eq('request_id',requestId).in('status',['executing','authorized'])
  return json({error:'AGENT_OPERATION_FAILED',request_id:requestId},500)
 }
}
