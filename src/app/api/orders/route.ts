import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const MAX_ITEMS = 50
const MAX_QUANTITY_PER_ITEM = 100
const checkoutSchema = z.object({
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM) })).min(1).max(MAX_ITEMS),
  affiliate_ref: z.string().trim().max(128).optional().nullable(),
  region: z.string().trim().min(1).max(32).default('GLOBAL'),
})
function jsonError(message:string,status:number,code:string){return NextResponse.json({success:false,error:message,code},{status,headers:{'Cache-Control':'no-store'}})}
function getRequestId(request:Request){const supplied=request.headers.get('x-request-id');return supplied&&supplied.length<=128&&/^[a-zA-Z0-9._:-]+$/.test(supplied)?supplied:crypto.randomUUID()}
export async function POST(request:Request){
 const requestId=getRequestId(request)
 try{
  if(!(request.headers.get('content-type')??'').toLowerCase().includes('application/json')) return jsonError('La solicitud debe utilizar Content-Type: application/json.',415,'UNSUPPORTED_MEDIA_TYPE')
  const supabase=await createClient(); const {data:{user},error:authError}=await supabase.auth.getUser()
  if(authError||!user) return jsonError('Debes iniciar sesión para continuar con el checkout.',401,'UNAUTHENTICATED')
  let raw:unknown; try{raw=await request.json()}catch{return jsonError('El cuerpo de la solicitud no contiene JSON válido.',400,'INVALID_JSON')}
  const parsed=checkoutSchema.safeParse(raw); if(!parsed.success)return jsonError('Los datos del checkout no son válidos.',400,'INVALID_CHECKOUT_DATA')
  const totals=new Map<string,number>(); for(const item of parsed.data.items){const next=(totals.get(item.product_id)??0)+item.quantity;if(next>MAX_QUANTITY_PER_ITEM)return jsonError(`La cantidad máxima por producto es ${MAX_QUANTITY_PER_ITEM}.`,400,'QUANTITY_LIMIT_EXCEEDED');totals.set(item.product_id,next)}
  const normalizedItems=Array.from(totals.entries()).map(([product_id,quantity])=>({product_id,quantity})).sort((a,b)=>a.product_id.localeCompare(b.product_id))
  const idempotencyKey=request.headers.get('idempotency-key')?.trim()||requestId
  const admin=createAdminClient()
  const {data:rpcData,error:rpcError}=await admin.rpc('create_pending_order_batch',{p_buyer_id:user.id,p_items:normalizedItems,p_affiliate_ref:parsed.data.affiliate_ref?.trim()||null,p_region:parsed.data.region,p_idempotency_key:idempotencyKey})
  if(rpcError){const m=rpcError.message?.toLowerCase()??''; if(m.includes('insufficient_stock')||m.includes('stock_changed')||m.includes('out_of_stock'))return jsonError('Uno o más productos ya no tienen inventario suficiente.',409,'STOCK_CHANGED'); if(m.includes('product_not_found')||m.includes('product_inactive'))return jsonError('Uno de los productos seleccionados ya no está disponible.',409,'PRODUCT_NOT_AVAILABLE'); if(m.includes('invalid_affiliate'))return jsonError('La referencia de afiliado no es válida.',400,'INVALID_AFFILIATE'); return jsonError('No fue posible crear la orden. Inténtalo nuevamente.',500,'ORDER_CREATION_FAILED')}
  const result=Array.isArray(rpcData)?rpcData[0]:rpcData; if(!result||typeof result!=='object'||typeof result.order_id!=='string')return jsonError('La respuesta de la orden no fue válida.',500,'INVALID_ORDER_RESPONSE')
  return NextResponse.json({success:true,requestId,orderId:result.order_id,status:typeof result.status==='string'?result.status:'pending',totalAmount:Number(result.total_amount),commissionAmount:Number(result.commission_amount),currency:typeof result.currency==='string'?result.currency:'USD'},{status:201,headers:{'Cache-Control':'no-store'}})
 }catch(error){console.error(`[checkout:${requestId}]`,error);return jsonError('Ocurrió un error inesperado al procesar el checkout.',500,'INTERNAL_SERVER_ERROR')}
}
