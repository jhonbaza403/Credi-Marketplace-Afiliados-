import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/security/csrf'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const mediaSchema=z.array(z.object({kind:z.enum(['image','video','audio']).default('image'),url:z.string().url().max(4096),name:z.string().trim().max(255).optional()})).min(1).max(10)
const createSchema=z.object({name:z.string().trim().min(2).max(160),media:mediaSchema,primaryTexts:z.array(z.string().trim().min(2).max(500)).min(1).max(5),headlines:z.array(z.string().trim().min(2).max(160)).min(1).max(5),callToAction:z.string().trim().min(2).max(60).default('Comprar'),destinationUrl:z.string().trim().url().max(2048).nullable().default(null),productId:z.string().uuid().nullable().default(null)})
const err=(message:string,status:number,code:string)=>NextResponse.json({success:false,error:message,code},{status,headers:{'Cache-Control':'no-store'}})

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const supabase=await createClient()
  const {data:{user},error}=await supabase.auth.getUser()
  if(error)return err('No fue posible verificar la sesión.',401,'AUTHENTICATION_ERROR')
  if(!user)return err('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const {id}=await params
  if(!z.string().uuid().safeParse(id).success)return err('Campaña inválida.',400,'INVALID_CAMPAIGN_ID')
  const {data:campaign}=await supabase.from('marketing_campaigns').select('id').eq('id',id).eq('owner_id',user.id).maybeSingle()
  if(!campaign)return err('Campaña no encontrada.',404,'CAMPAIGN_NOT_FOUND')
  const {data,error:creativeError}=await supabase.from('marketing_ad_sets').select('id,name,status,marketing_creatives(id,name,media,primary_texts,headlines,call_to_action,destination_url,product_id,creative_hash,status,created_at,updated_at),marketing_ads(id,name,status,delivery_state,creative_id)').eq('campaign_id',id).order('created_at',{ascending:false})
  if(creativeError)return err('No fue posible cargar las creatividades.',500,'CREATIVES_UNAVAILABLE')
  return NextResponse.json({adSets:data??[]},{headers:{'Cache-Control':'private, no-store'}})
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOrigin(request))return err('Origen no autorizado.',403,'CSRF_VALIDATION_FAILED')
  const supabase=await createClient()
  const {data:{user},error}=await supabase.auth.getUser()
  if(error)return err('No fue posible verificar la sesión.',401,'AUTHENTICATION_ERROR')
  if(!user)return err('Debes iniciar sesión.',401,'UNAUTHENTICATED')
  const {id}=await params
  if(!z.string().uuid().safeParse(id).success)return err('Campaña inválida.',400,'INVALID_CAMPAIGN_ID')
  const {data:campaign}=await supabase.from('marketing_campaigns').select('id,name,product_id,destination_url').eq('id',id).eq('owner_id',user.id).maybeSingle()
  if(!campaign)return err('Campaña no encontrada.',404,'CAMPAIGN_NOT_FOUND')
  const parsed=createSchema.safeParse(await request.json().catch(()=>null))
  if(!parsed.success)return err('La creatividad no es válida.',400,'INVALID_CREATIVE_DATA')
  const p=parsed.data

  if(p.productId){
    const {data:product}=await supabase.from('products').select('id,store_id,is_active,stock').eq('id',p.productId).maybeSingle()
    if(!product||!product.is_active||product.stock<=0)return err('El producto seleccionado no está disponible.',409,'PRODUCT_NOT_AVAILABLE')
    const {data:store}=await supabase.from('stores').select('id,vendor_id,is_active').eq('id',product.store_id).maybeSingle()
    if(!store||store.vendor_id!==user.id||!store.is_active)return err('No puedes promocionar este producto.',403,'PRODUCT_OWNER_FORBIDDEN')
  }

  const {data:existingSet}=await supabase.from('marketing_ad_sets').select('id').eq('campaign_id',id).order('created_at',{ascending:true}).limit(1).maybeSingle()
  let adSetId=existingSet?.id
  if(!adSetId){
    const {data:set,error:setError}=await supabase.from('marketing_ad_sets').insert({campaign_id:id,name:campaign.name+' · Ad Set 1',status:'draft',daily_budget:0,audience_snapshot:{},placements:['credi_wall','credi_story','credi_reel','credi_marketplace','credi_live'],schedule_config:{},bid_strategy:'auto',optimization_goal:'conversions'}).select('id').single()
    if(setError||!set)return err('No fue posible preparar el grupo de anuncios.',500,'AD_SET_CREATE_FAILED')
    adSetId=set.id
  }

  const {data:creative,error:creativeError}=await supabase.from('marketing_creatives').insert({ad_set_id:adSetId,name:p.name,media:p.media,primary_texts:p.primaryTexts,headlines:p.headlines,call_to_action:p.callToAction,destination_url:p.destinationUrl??campaign.destination_url,product_id:p.productId??campaign.product_id,status:'draft'}).select('id,name,media,primary_texts,headlines,call_to_action,destination_url,product_id,status,created_at,updated_at').single()
  if(creativeError||!creative)return err('No fue posible guardar la creatividad.',500,'CREATIVE_CREATE_FAILED')

  const {data:ad,error:adError}=await supabase.from('marketing_ads').insert({ad_set_id:adSetId,creative_id:creative.id,name:p.name,status:'draft',delivery_state:'not_started'}).select('id,name,status,delivery_state,creative_id').single()
  if(adError||!ad)return err('La creatividad se guardó, pero no fue posible crear el anuncio.',500,'AD_CREATE_FAILED')
  return NextResponse.json({success:true,adSetId,creative,ad},{status:201,headers:{'Cache-Control':'no-store'}})
}