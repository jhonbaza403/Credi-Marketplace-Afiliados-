import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(url: string, params: Map<string, string[]>, signature: string, token: string) {
  let canonical = url;
  const keys = Array.from(params.keys()).sort();
  for (const key of keys) {
    const values = params.get(key) ?? [];
    canonical += values.slice().sort().map((value) => key + value).join("");
  }
  const expected = createHmac("sha1", token).update(canonical, "utf8").digest("base64");
  const actual = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes);
}
function reply() {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Gracias. Hemos recibido tu mensaje.</Message></Response>', {
    status: 200, headers: { "Content-Type":"text/xml; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" }
  });
}
export async function POST(request: Request) {
  const token=process.env.TWILIO_AUTH_TOKEN?.trim(), expectedUrl=process.env.TWILIO_WEBHOOK_URL?.trim();
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
  const params = new Map<string, string[]>();
  for (const [key, value] of form.entries()) {
    const values = params.get(key) ?? [];
    values.push(value);
    params.set(key, values);
  }
  if (!validSignature(expectedUrl,params,signature,token)) return Response.json({error:"invalid_webhook_signature"},{status:401,headers:{"Cache-Control":"no-store"}});
  const sid=form.get("MessageSid") ?? form.get("SmsSid");
  if (!sid || !/^[A-Za-z0-9]{16,64}$/.test(sid)) return Response.json({error:"missing_message_id"},{status:400});
  try {
    const admin=createAdminClient();
    const {error}=await admin.from("communication_webhook_events").upsert({
      provider:"twilio",provider_event_id:sid,event_type:"message.inbound",status:"received",
      payload:{messageSid:sid,messageStatus:form.get("MessageStatus"),numMedia:form.get("NumMedia") ?? "0"},
      received_at:new Date().toISOString()
    },{onConflict:"provider,provider_event_id",ignoreDuplicates:true});
    if(error) throw error;
    return reply();
  } catch { return Response.json({error:"webhook_processing_failed"},{status:500,headers:{"Cache-Control":"no-store"}}); }
}
