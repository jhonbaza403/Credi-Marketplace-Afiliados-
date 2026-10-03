import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { distributedRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/auth";
import { isSameOrigin } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2).max(180),
  objective: z.enum(["awareness","traffic","engagement","leads","sales","catalog","live_attendance"]),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).default("USD"),
  dailyBudget: z.number().finite().min(0).max(1_000_000),
  lifetimeBudget: z.number().finite().min(0).max(100_000_000).nullable().default(null),
  startAt: z.string().datetime().nullable().default(null),
  endAt: z.string().datetime().nullable().default(null),
  destinationUrl: z.string().trim().url().max(2048).nullable().default(null),
  productId: z.string().uuid().nullable().default(null),
  liveRoomId: z.string().uuid().nullable().default(null),
  optimizationGoal: z.string().trim().min(2).max(80).default("conversions"),
  bidStrategy: z.enum(["auto","lowest_cost","cost_cap","manual"]).default("auto"),
  audience: z.object({
    type: z.enum(["broad","custom","retargeting","lookalike","interest","contextual"]).default("broad"),
    countries: z.array(z.string().trim().length(2)).max(80).default([]),
    ageMin: z.number().int().min(13).max(100).default(18),
    ageMax: z.number().int().min(13).max(100).default(65),
    interests: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
    excludeExistingCustomers: z.boolean().default(false),
  }).default({
  placements: z.array(z.enum(["credi_wall","credi_story","credi_reel","credi_marketplace","credi_live"])).min(1).max(5),
});

const errorResponse = (message:string,status:number,code:string) =>
  NextResponse.json({success:false,error:message,code},{status,headers:{"Cache-Control":"no-store"}});

export async function GET() {
  const supabase = await createClient();
  const { data:{user}, error } = await supabase.auth.getUser();
  if (error) return errorResponse("No fue posible verificar la sesión.",401,"AUTHENTICATION_ERROR");
  if (!user) return errorResponse("Debes iniciar sesión.",401,"UNAUTHENTICATED");

  const { data:campaigns,error:campaignError } = await supabase
    .from("marketing_campaigns")
    .select("id,name,objective,status,currency,daily_budget,lifetime_budget,start_at,end_at,destination_url,product_id,live_room_id,optimization_goal,bid_strategy,audience_config,placement_config,created_at,updated_at")
    .eq("owner_id",user.id)
    .order("created_at",{ascending:false})
    .limit(100);

  if (campaignError) return errorResponse("No fue posible cargar las campañas.",500,"CAMPAIGNS_UNAVAILABLE");

  const ids=(campaigns??[]).map((c)=>c.id);
  const metricsByCampaign:Record<string,{impressions:number;clicks:number;purchases:number;spend:number;revenue:number}>={};

  if(ids.length){
    const {data:metrics}=await supabase.from("marketing_daily_metrics").select("campaign_id,impressions,clicks,purchases,spend,revenue").in("campaign_id",ids);
    for(const row of metrics??[]){
      const current=metricsByCampaign[row.campaign_id]??{impressions:0,clicks:0,purchases:0,spend:0,revenue:0};
      current.impressions+=Number(row.impressions??0);
      current.clicks+=Number(row.clicks??0);
      current.purchases+=Number(row.purchases??0);
      current.spend+=Number(row.spend??0);
      current.revenue+=Number(row.revenue??0);
      metricsByCampaign[row.campaign_id]=current;
    }
  }

  return NextResponse.json({
    campaigns:(campaigns??[]).map((campaign)=>({...campaign,metrics:metricsByCampaign[campaign.id]??{impressions:0,clicks:0,purchases:0,spend:0,revenue:0}}))
  },{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request:Request){
  const requestId=crypto.randomUUID();
  try{
    if(!isSameOrigin(request)) return errorResponse("Origen no autorizado.",403,"CSRF_VALIDATION_FAILED");

    const supabase=await createClient();
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError) return errorResponse("No fue posible verificar la sesión.",401,"AUTHENTICATION_ERROR");
    if(!user) return errorResponse("Debes iniciar sesión para crear una campaña.",401,"UNAUTHENTICATED");

    const limit=await distributedRateLimit(supabase,`marketing:${user.id}:${getRequestIp(request)}`,{limit:20,windowMs:60_000});
    if(!limit.success) return errorResponse("Demasiadas solicitudes. Inténtalo más tarde.",429,"RATE_LIMITED");

    const parsed=schema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success) return errorResponse("La configuración de la campaña no es válida.",400,"INVALID_CAMPAIGN_DATA");

    const p=parsed.data;
    if(p.endAt&&p.startAt&&new Date(p.endAt).getTime()<=new Date(p.startAt).getTime()) return errorResponse("La fecha final debe ser posterior al inicio.",400,"INVALID_SCHEDULE");
    if(p.audience.ageMax<p.audience.ageMin) return errorResponse("El rango de audiencia no es válido.",400,"INVALID_AUDIENCE_AGE");
    if(p.objective==="live_attendance"&&!p.liveRoomId) return errorResponse("La campaña LIVE necesita una sala LIVE.",400,"LIVE_ROOM_REQUIRED");

    const {data:campaign,error:insertError}=await supabase.from("marketing_campaigns").insert({
      owner_id:user.id,
      name:p.name,
      objective:p.objective,
      status:"draft",
      currency:p.currency.toUpperCase(),
      daily_budget:p.dailyBudget,
      lifetime_budget:p.lifetimeBudget,
      start_at:p.startAt,
      end_at:p.endAt,
      destination_url:p.destinationUrl,
      product_id:p.productId,
      live_room_id:p.liveRoomId,
      optimization_goal:p.optimizationGoal,
      bid_strategy:p.bidStrategy,
      audience_config:p.audience,
      placement_config:p.placements,
    }).select("id,name,objective,status,currency,daily_budget,lifetime_budget,start_at,end_at,destination_url,product_id,live_room_id,optimization_goal,bid_strategy,audience_config,placement_config,created_at,updated_at").single();

    if(insertError||!campaign){
      console.error(`[marketing:${requestId}] campaign create failed`,insertError);
      return errorResponse("No fue posible crear la campaña.",500,"CAMPAIGN_CREATE_FAILED");
    }

    return NextResponse.json({success:true,campaign},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error(`[marketing:${requestId}] unexpected`,error);
    return errorResponse("No fue posible procesar la campaña.",500,"MARKETING_INTERNAL_ERROR");
  }
}
