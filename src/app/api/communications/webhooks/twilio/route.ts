import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(url: string, params: Record<string,string[]>, signature: string, token: string) {
  const canonical = url + Object.keys(params).sort().map((key) =>
    params[key].slice().sort().map((value) => key + value).join("")
  ).join("");
  const expected = createHmac("sha1", token).update(canonical, "utf8").digest("base64");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a,b);
}
function reply() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Gracias. Hemos recibido tu mensaje.</Message></Response>', {
    status: 200, headers: { "Content-Type":"text/xml; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" }
  });
}
export async function POST(request: Request) {
  const token=process.env.TWILIO_AUTH_TOKEN, expectedUrl=process.env.TWILIO_WEBHOOK_URL;
  const signature=request.headers.get("x-twilio-signature");
  if (!token || !expectedUrl || !signature) return Response.json({error:"webhook_not_configured"},{status:503,headers:{"Cache-Control":"no-store"}});
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/x-www-form-urlencoded")) {
    return Response.json({ error: "form_urlencoded_required" }, { status: 415 });
  }
  let rawBody: string;
  try { rawBody = await request.text(); } catch { return Response.json({error:"invalid_form_data"},{status:400}); }
  if (Buffer.byteLength(rawBody, "utf8") > 256_000) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }
  const form = new URLSearchParams(rawBody);
  const params: Record<string,string[]> = {};
  for (const [key,value] of form.entries()) (params[key] ??= []).push(value);
  if (!validSignature(expectedUrl,params,signature,token)) return Response.json({error:"invalid_webhook_signature"},{status:401,headers:{"Cache-Control":"no-store"}});
  const sid=(params.MessageSid ?? params.SmsSid)?.[0];
  if (!sid || !/^[A-Za-z0-9]{16,64}$/.test(sid)) return Response.json({error:"missing_message_id"},{status:400});
  try {
    const admin=createAdminClient();
    const {error}=await admin.from("communication_webhook_events").upsert({
      provider:"twilio",provider_event_id:sid,event_type:"message.inbound",status:"received",
      payload:{messageSid:sid,messageStatus:params.MessageStatus?.[0] ?? null,numMedia:params.NumMedia?.[0] ?? "0"},
      received_at:new Date().toISOString()
    },{onConflict:"provider,provider_event_id",ignoreDuplicates:true});
    if(error) throw error;
    return reply();
  } catch { return Response.json({error:"webhook_processing_failed"},{status:500,headers:{"Cache-Control":"no-store"}}); }
}
