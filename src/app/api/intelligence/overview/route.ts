import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
const complete=(status:string)=>['paid','completed','fulfilled','delivered'].includes(status.toLowerCase())

export async function GET(){
 const supabase=await createClient(); const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return json({error:'UNAUTHORIZED'},401)
 const {data:store}=await supabase.from('stores').select('id,store_name,is_verified,is_active').eq('vendor_id',auth.user.id).maybeSingle()
 const storeId=store?.id ?? null
 if(!storeId)return json({period_days:90,available:false,metrics:{gmv:0,revenue:0,orders:0,aov:0,repeat_purchase_rate:null,inventory_turnover:null,gross_margin:null,supplier_performance:null,b2b_pipeline:0,ai_assisted_revenue:0},data_quality:{conversion:'insufficient_events',clv:'insufficient_customer_history',inventory_turnover:'insufficient_cogs'}})
 const since=new Date(Date.now()-90*24*60*60*1000).toISOString()
 const [{data:items},{data:products},{count:b2bPipeline},{data:audit}] = await Promise.all([
  supabase.from('order_items').select('order_id,product_id,quantity,unit_price,subtotal,store_id,created_at').eq('store_id',storeId).gte('created_at',since).limit(10000),
  supabase.from('products').select('id,price,stock,is_active').eq('store_id',storeId).limit(5000),
  supabase.from('business_rfqs').select('id',{count:'exact',head:true}).eq('status','open'),
  supabase.from('agent_action_audit').select('action,status,output,input,created_at').eq('owner_id',auth.user.id).gte('created_at',since).limit(5000),
 ])
 const uniqueOrders=new Set((items??[]).map(x=>x.order_id)); const sold=(items??[]).reduce((s,x)=>s+Number(x.quantity||0),0); const revenue=(items??[]).reduce((s,x)=>s+Number(x.subtotal||0),0)
 const buyers = new Map<string,number>();
 if(uniqueOrders.size){ const {data:orderRows}=await supabase.from('orders').select('id,buyer_id,status,total_amount,created_at').in('id',Array.from(uniqueOrders)).limit(10000); for(const o of orderRows??[]){ if(complete(String(o.status)))buyers.set(o.buyer_id,(buyers.get(o.buyer_id)??0)+1) } }
 const repeatBuyers=Array.from(buyers.values()).filter(v=>v>1).length; const buyerCount=buyers.size
 const avgStock=(products??[]).reduce((s,p)=>s+Math.max(0,Number(p.stock||0)),0)
 const aiActions=(audit??[]).filter(x=>String(x.status)==='executed' && ['publish_offer','send_commercial_message','create_payment'].includes(String(x.action))).length
 const aiRevenue=(audit??[]).filter(x=>String(x.status)==='executed' && String(x.action)==='create_payment').reduce((s,x)=>s+Number((x.input as any)?.amount||0),0)
 return json({available:true,period_days:90,store,metrics:{gmv:revenue,revenue,orders:uniqueOrders.size,aov:uniqueOrders.size?revenue/uniqueOrders.size:0,repeat_purchase_rate:buyerCount?repeatBuyers/buyerCount:null,inventory_turnover:sold&&avgStock?sold/Math.max(avgStock,1):null,gross_margin:null,supplier_performance:null,b2b_pipeline:b2bPipeline??0,ai_assisted_revenue:aiRevenue,ai_executed_actions:aiActions},data_quality:{conversion:'not measured without impression/click event denominator',clv:'not measured without customer cohort revenue horizon',gross_margin:'requires cost-of-goods data',supplier_performance:'requires supplier-level fulfillment dataset',inventory_turnover:'proxy based on observed units sold vs current stock'}})
}
