import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
}));

import { POST as twilioPost } from "@/app/api/communications/webhooks/twilio/route";
import { POST as affiliatePost } from "@/app/api/affiliate/webhook/route";

function twilioSignature(url: string, pairs: Array<[string, string]>, token: string) {
  const grouped: Record<string, string[]> = {};
  for (const [key, value] of pairs) (grouped[key] ??= []).push(value);
  const canonical = url + Object.keys(grouped).sort()
    .map((key) => grouped[key].slice().sort().map((value) => key + value).join(""))
    .join("");
  return createHmac("sha1", token).update(canonical, "utf8").digest("base64");
}

function affiliateSignature(timestamp: string, raw: string, secret: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${raw}`, "utf8").digest("hex");
}

beforeEach(() => {
  vi.stubEnv("TWILIO_AUTH_TOKEN", "test-twilio-token");
  vi.stubEnv("TWILIO_WEBHOOK_URL", "https://example.test/api/communications/webhooks/twilio");
  vi.stubEnv("AFFILIATE_WEBHOOK_SECRET", "test-affiliate-secret");
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.from.mockImplementation((table: string) => table === "communication_webhook_events"
    ? { upsert: mocks.upsert }
    : { select: mocks.select, insert: mocks.insert });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Twilio inbound webhook", () => {
  it("fails closed when the signature configuration is missing", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    const response = await twilioPost(new Request("https://example.test/api/communications/webhooks/twilio", { method: "POST" }));
    expect(response.status).toBe(503);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature before accessing the database", async () => {
    const body = new URLSearchParams({ MessageSid: "SM1234567890123456" });
    const response = await twilioPost(new Request("https://example.test/api/communications/webhooks/twilio", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": "invalid" },
      body,
    }));
    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("accepts valid signatures and canonicalizes repeated parameters", async () => {
    const pairs: Array<[string, string]> = [
      ["MessageSid", "SM1234567890123456"],
      ["Tag", "zeta"],
      ["Tag", "alpha"],
    ];
    const body = new URLSearchParams();
    for (const [key, value] of pairs) body.append(key, value);
    const signature = twilioSignature("https://example.test/api/communications/webhooks/twilio", pairs, "test-twilio-token");
    const response = await twilioPost(new Request("https://example.test/api/communications/webhooks/twilio", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": signature },
      body,
    }));
    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("communication_webhook_events");
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      provider: "twilio",
      provider_event_id: "SM1234567890123456",
    }), expect.objectContaining({ onConflict: "provider,provider_event_id", ignoreDuplicates: true }));
  });
});

describe("external affiliate webhook", () => {
  it("rejects stale timestamps and invalid signatures", async () => {
    const raw = JSON.stringify({ id: "evt-123456", type: "commission.pending", data: {} });
    const stale = String(Math.floor(Date.now() / 1000) - 600);
    const staleResponse = await affiliatePost(new Request("https://example.test/api/affiliate/webhook", {
      method: "POST",
      headers: { "x-credi-timestamp": stale, "x-credi-event-id": "evt-123456", "x-credi-signature": `sha256=${affiliateSignature(stale, raw, "test-affiliate-secret")}` },
      body: raw,
    }));
    expect(staleResponse.status).toBe(401);

    const timestamp = String(Math.floor(Date.now() / 1000));
    const invalidResponse = await affiliatePost(new Request("https://example.test/api/affiliate/webhook", {
      method: "POST",
      headers: { "x-credi-timestamp": timestamp, "x-credi-event-id": "evt-123456", "x-credi-signature": "sha256=" + "0".repeat(64) },
      body: raw,
    }));
    expect(invalidResponse.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("stores a correctly signed event once and acknowledges an exact retry", async () => {
    const raw = JSON.stringify({ id: "evt-123456", type: "commission.pending", data: { orderId: "order-1" } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = "sha256=" + affiliateSignature(timestamp, raw, "test-affiliate-secret");
    const request = () => new Request("https://example.test/api/affiliate/webhook", {
      method: "POST",
      headers: { "x-credi-timestamp": timestamp, "x-credi-event-id": "evt-123456", "x-credi-signature": signature },
      body: raw,
    });

    const first = await affiliatePost(request());
    expect(first.status).toBe(202);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      provider_event_id: "evt-123456",
      payload_sha256: createHash("sha256").update(raw).digest("hex"),
    }));

    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: "db-row-1", payload_sha256: createHash("sha256").update(raw).digest("hex") },
      error: null,
    });
    const retry = await affiliatePost(request());
    expect(retry.status).toBe(200);
    await expect(retry.json()).resolves.toEqual({ accepted: true, duplicate: true });
  });
});
