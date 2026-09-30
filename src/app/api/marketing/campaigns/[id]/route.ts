import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema=z.object({
  status:z.enum(["draft","review","active","paused","completed","archived"]).optional(),
  name:z.string().trim().min(2).max(180).optional(),
  dailyBudget:z.number().finite().min(0).max(1_000_000).optional(),
  lifetimeBudget:z.number().finite().min(0).max(100_000_000).nullable().optional(),
  startAt:z.string().datetime().nullable().optional(),
  endAt:z.string().datetime().nullable().optional(),
});

const err=(message:string,status:number,code:string)=>NextResponse.json({success:false,error:message,code},{status,headers:{"Cache-Control":"no-store"}});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!isSameOrigin(request)) return err("Origen no autorizado.",403,"CSRF_VALIDATION_FAILED");
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError) return err("No fue posible verificar la sesión.",401,"AUTHENTICATION_ERROR");
  if(!user) return err("Debes iniciar sesión.",401,"UNAUTHENTICATED");

  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success) return err("Identificador de campaña inválido.",400,"INVALID_CAMPAIGN_ID");
  const parsed=patchSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return err("Los cambios de campaña no son válidos.",400,"INVALID_CAMPAIGN_UPDATE");

  const updates:Record<string,unknown>={};
  if(parsed.data.status) updates.status=parsed.data.status;
  if(parsed.data.name) updates.name=parsed.data.name;
  if(parsed.data.dailyBudget!==undefined) updates.daily_budget=parsed.data.dailyBudget;
  if(parsed.data.lifetimeBudget!==undefined) updates.lifetime_budget=parsed.data.lifetimeBudget;
  if(parsed.data.startAt!==undefined) updates.start_at=parsed.data.startAt;
  if(parsed.data.endAt!==undefined) updates.end_at=parsed.data.endAt;
  if(!Object.keys(updates).length) return err("No hay cambios que aplicar.",400,"EMPTY_UPDATE");

  if(updates.status==="active"){
    let budget=Number(updates.daily_budget??0);
    if(!budget){
      const {data:existing}=await supabase.from("marketing_campaigns").select("daily_budget").eq("id",id).eq("owner_id",user.id).maybeSingle();
      budget=Number(existing?.daily_budget??0);
    }
    if(budget<=0) return err("La campaña necesita presupuesto diario mayor que cero.",409,"BUDGET_REQUIRED");

    const {data:sets}=await supabase.from("marketing_ad_sets").select("id").eq("campaign_id",id);
    const setIds=(sets??[]).map((item)=>item.id);
    if(!setIds.length) return err("La campaña necesita al menos una creatividad antes de activarse.",409,"CREATIVE_REQUIRED");
    const {count}=await supabase.from("marketing_ads").select("id",{count:"exact",head:true}).in("ad_set_id",setIds);
    if(!count) return err("La campaña necesita al menos un anuncio preparado antes de activarse.",409,"AD_REQUIRED");
  }

  const {data:campaign,error}=await supabase.from("marketing_campaigns").update(updates).eq("id",id).eq("owner_id",user.id)
    .select("id,name,objective,status,currency,daily_budget,lifetime_budget,start_at,end_at,destination_url,product_id,live_room_id,optimization_goal,bid_strategy,audience_config,placement_config,created_at,updated_at").maybeSingle();

  if(error) return err("No fue posible actualizar la campaña.",500,"CAMPAIGN_UPDATE_FAILED");
  if(!campaign) return err("Campaña no encontrada.",404,"CAMPAIGN_NOT_FOUND");
  return NextResponse.json({success:true,campaign},{headers:{"Cache-Control":"no-store"}});
}
