import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripeRequest, type StripeCheckoutSession } from '@/lib/billing/stripe'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const appUrl=()=>((process.env.NEXT_PUBLIC_APP_URL??'https://credi-marketplace-afiliados.vercel.app').replace(/\/$/,''))
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
export async function POST(request:Request){
 const requestId=crypto.randomUUID()
 try{
  const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
  let body:Record<string,unknown>; try{body=await request.json() as Record<string,unknown>}catch{return json({error:'INVALID_JSON'},400)}
  const orderId=typeof body.order_id==='string'?body.order_id:''; if(!orderId)return json({error:'ORDER_REQUIRED'},400)
  if(!process.env.STRIPE_SECRET_KEY?.trim())return json({error:'STRIPE_NOT_CONFIGURED'},503)
  const admin=createAdminClient()
  const {data:order}=await admin.from('orders').select('id,buyer_id,status,payment_status,total_amount,currency,region,expires_at').eq('id',orderId).maybeSingle()
  if(!order)return json({error:'ORDER_NOT_FOUND'},404); if(order.buyer_id!==auth.user.id)return json({error:'FORBIDDEN'},403); if(!['pending'].includes(String(order.status)))return json({error:'ORDER_NOT_PAYABLE',status:order.status},409)
  if(order.expires_at&&new Date(order.expires_at).getTime()<=Date.now())return json({error:'ORDER_EXPIRED'},409)
  const {data:items,error:itemError}=await admin.from('order_items').select('product_id,product_title,quantity,unit_price,subtotal,store_id').eq('order_id',orderId).limit(100)
  if(itemError||!items?.length)return json({error:'ORDER_ITEMS_UNAVAILABLE'},409)
  const params=new URLSearchParams(); params.set('mode','payment'); params.set('success_url',`${appUrl()}/orders?payment=success&order_id=${orderId}`); params.set('cancel_url',`${appUrl()}/orders?payment=cancelled&order_id=${orderId}`); params.set('client_reference_id',orderId); params.set('metadata[order_id]',orderId); params.set('metadata[user_id]',auth.user.id); params.set('metadata[request_id]',requestId)
  items.forEach((item,index)=>{params.set(`line_items[${index}][price_data][currency]`,String(order.currency).toLowerCase());params.set(`line_items[${index}][price_data][product_data][name]`,item.product_title.slice(0,500));params.set(`line_items[${index}][price_data][unit_amount]`,String(Math.round(Number(item.unit_price)*100)));params.set(`line_items[${index}][quantity]`,String(item.quantity))})
  const session=await stripeRequest<StripeCheckoutSession>('/checkout/sessions',{method:'POST',body:params}); if(!session.url)return json({error:'CHECKOUT_URL_MISSING'},502)
  await admin.from('payment_orchestrations').upsert({user_id:auth.user.id,order_id:orderId,amount:Number(order.total_amount),currency:order.currency,method_type:'stripe',provider:'stripe',status:'pending',provider_reference:session.id,client_reference:`order:${orderId}`,idempotency_key:`stripe-checkout:${orderId}`,metadata:{request_id:requestId,stripe_checkout_session_id:session.id},expires_at:new Date(Date.now()+30*60*1000)},{onConflict:'idempotency_key'})
  return json({ok:true,order_id:orderId,checkout_url:session.url,stripe_session_id:session.id},201)
 }catch(error){console.error('order-checkout',requestId,error);return json({error:'STRIPE_ORDER_CHECKOUT_FAILED',request_id:requestId},502)}
}
