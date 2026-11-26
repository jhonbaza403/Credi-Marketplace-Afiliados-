import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(url: string, params: Record<string, string[]>, signature: string, token: string) {
  let canonical = url;
  for (const key of Object.keys(params).sort()) {
    // Twilio signs each value as a separate key/value pair, including repeated form fields.
    canonical += params[key].slice().sort().map((value) => key + value).join("");
  }
  const expected = createHmac("sha1", token).update(canonical, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const expectedUrl = process.env.TWILIO_STATUS_WEBHOOK_URL?.trim();
  const signature = request.headers.get("x-twilio-signature");
  if (!token || !expectedUrl || !signature) {
    return Response.json({ error: "webhook_not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/x-www-form-urlencoded")) {
    return Response.json({ error: "form_urlencoded_required" }, { status: 415 });
  }
  let rawBody: string;
  try { rawBody = await request.text(); }
  catch { return Response.json({ error: "invalid_form_data" }, { status: 400 }); }
  if (Buffer.byteLength(rawBody, "utf8") > 256_000) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }
  const form = new URLSearchParams(rawBody);
  const params: Record<string, string[]> = {};
  for (const [key, value] of form.entries()) (params[key] ??= []).push(value);
  if (!validSignature(expectedUrl, params, signature, token)) {
    return Response.json({ error: "invalid_webhook_signature" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const sid = (params.MessageSid ?? params.SmsSid)?.[0];
  const status = params.MessageStatus?.[0]?.toLowerCase();
  const errorCode = params.ErrorCode?.[0] || null;
  const allowed = new Set(["accepted", "queued", "sending", "sent", "delivered", "undelivered", "failed", "canceled"]);
  if (!sid || !/^[A-Za-z0-9]{16,64}$/.test(sid) || !status || !allowed.has(status)) {
    return Response.json({ error: "invalid_status_payload" }, { status: 400 });
  }

  const eventKey = [sid, status, errorCode ?? ""].join(":");
  try {
    const admin = createAdminClient();
    const { error: eventError } = await admin.from("twilio_message_status_events").upsert({
      message_sid: sid,
      event_key: eventKey,
      message_status: status,
      error_code: errorCode,
    }, { onConflict: "event_key", ignoreDuplicates: true });
    if (eventError) throw eventError;

    // Status callbacks can be delayed or delivered out of order. Once a
    // terminal state is stored, a later stale callback must not regress it.
    const { error: requestError } = await admin.from("twilio_sms_requests").update({
      status,
      error_code: errorCode,
      updated_at: new Date().toISOString(),
    }).eq("message_sid", sid).not("status", "in", "(delivered,undelivered,failed,canceled)");
    if (requestError) throw requestError;

    return new Response("ok", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "status_persistence_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
