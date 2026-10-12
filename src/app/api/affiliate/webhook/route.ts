import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const EventSchema=z.object({
  id:z.string().min(1).max(160),
  type:z.string().regex(/^[a-z][a-z0-9_.-]{1,119}$/i),
  occurredAt:z.string().datetime().optional(),
  data:z.record(z.unknown()).default({})
}).strict();
function equalHex(expected:string,supplied:string) {
  if(!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const a=Buffer.from(expected,"hex"),b=Buffer.from(supplied,"hex");
  return a.length===b.length && timingSafeEqual(a,b);
}
/** Contract: HMAC-SHA256 of "<unix timestamp>.<raw body>", X-Credi-Event-Id must equal body.id.
 * This endpoint only records signed events; it never changes commissions or wallet balances.
 */
export async function POST(request:Request) {
  const secret=process.env.AFFILIATE_WEBHOOK_SECRET;
  if(!secret) return Response.json({error:"webhook_not_configured"},{status:503,headers:{"Cache-Control":"no-store"}});
  const timestamp=request.headers.get("x-credi-timestamp")??"";
  const eventId=request.headers.get("x-credi-event-id")??"";
  const header=request.headers.get("x-credi-signature")??"";
  const signature=header.startsWith("sha256=")?header.slice(7):"";
  if(!/^\d{10}$/.test(timestamp)||!/^[A-Za-z0-9._:-]{1,160}$/.test(eventId)) return Response.json({error:"invalid_webhook_headers"},{status:400});
  if(Math.abs(Math.floor(Date.now()/1000)-Number(timestamp))>300) return Response.json({error:"stale_webhook"},{status:401});
  let raw:string;
  try { raw=await request.text(); } catch { return Response.json({error:"invalid_body"},{status:400}); }
  if(Buffer.byteLength(raw,"utf8")>256_000) return Response.json({error:"payload_too_large"},{status:413});
  const expected=createHmac("sha256",secret).update(`${timestamp}.${raw}`,"utf8").digest("hex");
  if(!equalHex(expected,signature)) return Response.json({error:"invalid_webhook_signature"},{status:401,headers:{"Cache-Control":"no-store"}});
  let parsed:unknown;
  try { parsed=JSON.parse(raw); } catch { return Response.json({error:"invalid_json"},{status:400}); }
  const result=EventSchema.safeParse(parsed);
  if(!result.success||result.data.id!==eventId) return Response.json({error:"invalid_event_payload"},{status:400});
  const event=result.data, hash=createHash("sha256").update(raw).digest("hex");
  try {
    const admin=createAdminClient();
    const {data:existing,error:lookupError}=await admin.from("affiliate_webhook_events").select("id,payload_sha256").eq("provider_event_id",event.id).maybeSingle();
    if(lookupError) throw lookupError;
    if(existing) {
      if(existing.payload_sha256!==hash) return Response.json({error:"event_id_payload_conflict"},{status:409,headers:{"Cache-Control":"no-store"}});
      return Response.json({accepted:true,duplicate:true},{status:200,headers:{"Cache-Control":"no-store"}});
    }
    const {error}=await admin.from("affiliate_webhook_events").insert({
      provider_event_id:event.id,event_type:event.type,occurred_at:event.occurredAt??null,
      payload:event.data,payload_sha256:hash,status:"received"
    });
    if(error) {
      if(error.code==="23505") return Response.json({accepted:true,duplicate:true},{status:200,headers:{"Cache-Control":"no-store"}});
      throw error;
    }
    return Response.json({accepted:true,duplicate:false},{status:202,headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({error:"webhook_processing_failed"},{status:500,headers:{"Cache-Control":"no-store"}}); }
}
