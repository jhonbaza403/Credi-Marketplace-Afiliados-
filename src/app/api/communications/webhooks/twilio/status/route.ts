import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(url: string, params: Map<string, string[]>, signature: string, token: string) {
  let canonical = url;
  for (const key of Array.from(params.keys()).sort()) {
    const values = params.get(key) ?? [];
    canonical += values.slice().sort().map((value) => key + value).join("");
  }
  const expected = createHmac("sha1", token).update(canonical, "utf8").digest("base64");
  const actual = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes);
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
  const params = new Map<string, string[]>();
  for (const [key, value] of form.entries()) {
    const values = params.get(key) ?? [];
    values.push(value);
    params.set(key, values);
  }
  if (!validSignature(expectedUrl, params, signature, token)) {
    return Response.json({ error: "invalid_webhook_signature" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const sid = form.get("MessageSid") ?? form.get("SmsSid");
  const status = form.get("MessageStatus")?.toLowerCase();
  const errorCode = form.get("ErrorCode") || null;
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
