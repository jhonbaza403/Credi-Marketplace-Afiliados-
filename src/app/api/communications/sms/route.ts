import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "unauthorized" }, { status: 401 });

    // This endpoint sends only a fixed, user-requested transactional message to the
    // same user's verified Supabase Auth phone; it cannot be used to message others.
    if (!user.phone || !user.phone_confirmed_at) {
      return Response.json({ error: "verified_phone_required" }, { status: 400 });
    }

    let body: unknown;
    try { body = await request.json(); } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
    const idempotencyKey = typeof body === "object" && body !== null && "idempotencyKey" in body
      ? (body as { idempotencyKey?: unknown }).idempotencyKey : null;
    if (typeof idempotencyKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return Response.json({ error: "valid_idempotency_key_required" }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = process.env.TWILIO_FROM_NUMBER?.trim();
    const callback = process.env.TWILIO_STATUS_WEBHOOK_URL?.trim();
    if (!accountSid || !authToken || !from || !callback) {
      return Response.json({ error: "sms_service_not_configured" }, { status: 503 });
    }
    if (!/^AC[a-f0-9]{32}$/i.test(accountSid) || !/^\+[1-9]\d{7,14}$/.test(from) || !callback.startsWith("https://")) {
      return Response.json({ error: "sms_service_configuration_invalid" }, { status: 503 });
    }

    const admin = createAdminClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin.from("twilio_sms_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", since);
    if (countError) throw countError;
    if ((count ?? 0) >= 3) return Response.json({ error: "sms_hourly_limit_reached" }, { status: 429 });

    const { data: record, error: insertError } = await admin.from("twilio_sms_requests")
      .insert({ user_id: user.id, idempotency_key: idempotencyKey, status: "requested" })
      .select("id").single();
    if (insertError) {
      if (insertError.code === "23505") return Response.json({ error: "duplicate_request" }, { status: 409 });
      throw insertError;
    }

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          From: from,
          To: user.phone,
          Body: "Tu notificación de Credi Marketplace está lista. Si no solicitaste este mensaje, ignóralo.",
          StatusCallback: callback,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    const result = await twilioResponse.json().catch(() => ({})) as {
      sid?: string; status?: string; code?: number; message?: string;
    };
    if (!twilioResponse.ok || !result.sid) {
      await admin.from("twilio_sms_requests").update({
        status: "failed", error_code: String(result.code ?? twilioResponse.status), updated_at: new Date().toISOString(),
      }).eq("id", record.id);
      return Response.json({ error: "twilio_send_failed", providerCode: result.code ?? null }, { status: 502 });
    }

    await admin.from("twilio_sms_requests").update({
      message_sid: result.sid,
      status: ["queued", "accepted", "sending", "sent", "delivered", "undelivered", "failed"].includes(result.status ?? "")
        ? result.status : "accepted",
      updated_at: new Date().toISOString(),
    }).eq("id", record.id);

    return Response.json({ accepted: true, messageSid: result.sid, status: result.status ?? "accepted" }, {
      status: 202, headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "sms_request_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
