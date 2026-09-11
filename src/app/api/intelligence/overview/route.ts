import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime='nodejs'; export const dynamic='force-dynamic'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
const complete=(s:string)=>['paid','completed','fulfilled','delivered','processing'].includes(s.toLowerCase())
export async function GET(){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {data:store}=await supabase.from('stores').select('id,store_name,is_verified,is_active').eq('vendor_id',auth.user.id).maybeSingle(); if(!store)return json({available:false,period_days:90,metrics:{gmv:0,revenue:0,orders:0,aov:0,repeat_purchase_rate:null,inventory_turnover:null,gross_margin:null,clv:null,supplier_performance:null,b2b_pipeline:0,ai_assisted_revenue:0,conversion:null}})
 const since=new Date(Date.now()-90*86400000).toISOString(); const [{data:items},{data:products},{count:b2bPipeline},{data:audit},{data:events}]=await Promise.all([
  supabase.from('order_items').select('order_id,product_id,quantity,subtotal,store_id,created_at').eq('store_id',store.id).gte('created_at',since).limit(10000),
  supabase.from('products').select('id,price,cost_price,stock,is_active').eq('store_id',store.id).limit(5000),
  supabase.from('business_rfqs').select('id',{count:'exact',head:true}).eq('status','open'),
  supabase.from('agent_action_audit').select('action,status,input,created_at').eq('owner_id',auth.user.id).gte('created_at',since).limit(5000),
  supabase.from('commerce_events').select('event_type,amount,occurred_at').eq('store_id',store.id).gte('occurred_at',since).limit(20000),
 ])
 const rows=items??[]; const orderIds=[...new Set(rows.map(x=>x.order_id))]; const {data:orders}=orderIds.length?await supabase.from('orders').select('id,buyer_id,status,total_amount,created_at').in('id',orderIds).limit(10000):{data:[] as any[]}
 const completed=(orders??[]).filter(o=>complete(String(o.status))); const buyers=new Map<string,number>(); for(const o of completed)buyers.set(o.buyer_id,(buyers.get(o.buyer_id)??0)+1)
 const revenue=rows.filter(x=>completed.some(o=>o.id===x.order_id)).reduce((s,x)=>s+Number(x.subtotal||0),0); const units=rows.filter(x=>completed.some(o=>o.id===x.order_id)).reduce((s,x)=>s+Number(x.quantity||0),0)
 const revenueCost=rows.reduce((s,x)=>{const p=(products??[]).find(y=>y.id===x.product_id); return s+(Number(x.quantity||0)*Number(p?.cost_price||0))},0); const costKnown=rows.some(x=>{const p=(products??[]).find(y=>y.id===x.product_id);return p?.cost_price!=null}); const grossMargin=costKnown?revenue-revenueCost:null
 const views=(events??[]).filter(e=>e.event_type==='product_view').length; const checkouts=(events??[]).filter(e=>e.event_type==='checkout_started').length; const conversion=views?completed.length/views:null
 const repeatBuyers=[...buyers.values()].filter(v=>v>1).length; const buyerCount=buyers.size; const periodAov=completed.length?revenue/completed.length:0; const clv=buyerCount?revenue/buyerCount:null
 const avgStock=(products??[]).reduce((s,p)=>s+Math.max(0,Number(p.stock||0)),0); const aiRevenue=(audit??[]).filter(x=>x.status==='executed'&&x.action==='create_payment').reduce((s,x)=>s+Number((x.input as any)?.amount||0),0)
 return json({available:true,period_days:90,store,metrics:{gmv:revenue,revenue,orders:completed.length,aov:periodAov,repeat_purchase_rate:buyerCount?repeatBuyers/buyerCount:null,inventory_turnover:units&&avgStock?units/avgStock:null,gross_margin:grossMargin,clv,conversion,checkout_start_rate:views?checkouts/views:null,b2b_pipeline:b2bPipeline??0,ai_assisted_revenue:aiRevenue},data_quality:{conversion:views?'observed_event_denominator':'requires product_view events',clv:buyerCount?'90-day revenue-per-buyer proxy':'requires customer cohort history',gross_margin:costKnown?'calculated from product cost_price':'requires cost_price data',supplier_performance:'requires supplier fulfillment events',inventory_turnover:'90-day units sold/current stock proxy'}})
}
