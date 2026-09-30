import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const schema=z.object({roomId:z.string().uuid(),productId:z.string().uuid(),position:z.number().int().min(0).max(10000).default(0),pinned:z.boolean().default(false)})
const err=(message:string,status:number,code:string)=>NextResponse.json({success:false,error:message,code},{status,headers:{'Cache-Control':'no-store'}})

export async function GET(request:Request){
  const supabase=await createClient()
  const {data:{user},error}=await supabase.auth.getUser()
  if(error)return err('No fue posible verificar la sesión.',401,'AUTHENTICATION_ERROR')
  if(!user)return err('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const roomId=new URL(request.url).searchParams.get('roomId')||''
  if(!z.string().uuid().safeParse(roomId).success)return err('Sala LIVE inválida.',400,'INVALID_ROOM_ID')
  const {data:room}=await supabase.from('chat_live_rooms').select('id,host_user_id,status').eq('id',roomId).maybeSingle()
  if(!room)return err('Sala LIVE no encontrada.',404,'LIVE_ROOM_NOT_FOUND')
  if(room.status!=='live'&&room.host_user_id!==user.id)return err('La sala LIVE no está disponible.',403,'LIVE_ROOM_FORBIDDEN')
  const {data,error:productError}=await supabase.from('chat_live_products').select('room_id,product_id,position,is_pinned,pinned_at,created_at,products(id,title,price,image_url)').eq('room_id',roomId).order('position',{ascending:true})
  if(productError)return err('No fue posible cargar los productos LIVE.',500,'LIVE_PRODUCTS_UNAVAILABLE')
  return NextResponse.json({products:data??[]},{headers:{'Cache-Control':'private, no-store'}})
}

export async function POST(request:Request){
  if(!isSameOrigin(request))return err('Origen no autorizado.',403,'CSRF_VALIDATION_FAILED')
  const supabase=await createClient()
  const {data:{user},error}=await supabase.auth.getUser()
  if(error)return err('No fue posible verificar la sesión.',401,'AUTHENTICATION_ERROR')
  if(!user)return err('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const parsed=schema.safeParse(await request.json().catch(()=>null))
  if(!parsed.success)return err('La configuración del producto LIVE no es válida.',400,'INVALID_LIVE_PRODUCT')
  const p=parsed.data
  const {data:room}=await supabase.from('chat_live_rooms').select('id,host_user_id,status').eq('id',p.roomId).maybeSingle()
  if(!room)return err('Sala LIVE no encontrada.',404,'LIVE_ROOM_NOT_FOUND')
  if(room.host_user_id!==user.id)return err('No puedes administrar esta sala LIVE.',403,'LIVE_ROOM_FORBIDDEN')

  const {data:product}=await supabase.from('products').select('id,store_id,title,is_active,stock').eq('id',p.productId).maybeSingle()
  if(!product||!product.is_active||product.stock<=0)return err('El producto no está disponible para LIVE.',409,'PRODUCT_NOT_LIVE_READY')
  const {data:store}=await supabase.from('stores').select('id,vendor_id,is_active').eq('id',product.store_id).maybeSingle()
  if(!store||store.vendor_id!==user.id||!store.is_active)return err('El producto no pertenece a una tienda activa del anfitrión.',403,'PRODUCT_OWNER_FORBIDDEN')

  if(p.pinned)await supabase.from('chat_live_products').update({is_pinned:false,pinned_at:null}).eq('room_id',p.roomId).eq('is_pinned',true)
  const {data,error:saveError}=await supabase.from('chat_live_products').upsert({room_id:p.roomId,product_id:p.productId,position:p.position,is_pinned:p.pinned,pinned_at:p.pinned?new Date().toISOString():null},{onConflict:'room_id,product_id'}).select('room_id,product_id,position,is_pinned,pinned_at,created_at,products(id,title,price,image_url)').single()
  if(saveError||!data)return err('No fue posible guardar el producto LIVE.',500,'LIVE_PRODUCT_SAVE_FAILED')
  return NextResponse.json({success:true,product:data},{status:201,headers:{'Cache-Control':'no-store'}})
}

export async function DELETE(request:Request){
  if(!isSameOrigin(request))return err('Origen no autorizado.',403,'CSRF_VALIDATION_FAILED')
  const supabase=await createClient()
  const {data:{user},error}=await supabase.auth.getUser()
  if(error)return err('No fue posible verificar la sesión.',401,'AUTHENTICATION_ERROR')
  if(!user)return err('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const parsed=z.object({roomId:z.string().uuid(),productId:z.string().uuid()}).safeParse(await request.json().catch(()=>null))
  if(!parsed.success)return err('Datos inválidos.',400,'INVALID_LIVE_PRODUCT')
  const {data:room}=await supabase.from('chat_live_rooms').select('id').eq('id',parsed.data.roomId).eq('host_user_id',user.id).maybeSingle()
  if(!room)return err('Sala LIVE no encontrada.',404,'LIVE_ROOM_NOT_FOUND')
  const {error:deleteError}=await supabase.from('chat_live_products').delete().eq('room_id',parsed.data.roomId).eq('product_id',parsed.data.productId)
  if(deleteError)return err('No fue posible quitar el producto.',500,'LIVE_PRODUCT_DELETE_FAILED')
  return NextResponse.json({success:true},{headers:{'Cache-Control':'no-store'}})
}