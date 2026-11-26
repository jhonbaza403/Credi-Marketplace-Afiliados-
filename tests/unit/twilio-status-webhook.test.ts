import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  not: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
}));

import { POST } from "@/app/api/communications/webhooks/twilio/status/route";

const callbackUrl = "https://example.test/api/communications/webhooks/twilio/status";
const authToken = "test-twilio-token";

function signature(url: string, pairs: Array<[string, string]>, token: string) {
  const grouped: Record<string, string[]> = {};
  for (const [key, value] of pairs) (grouped[key] ??= []).push(value);
  const canonical = url + Object.keys(grouped).sort()
    .map((key) => grouped[key].slice().sort().map((value) => key + value).join(""))
    .join("");
  return createHmac("sha1", token).update(canonical, "utf8").digest("base64");
}

function request(pairs: Array<[string, string]>, sig = signature(callbackUrl, pairs, authToken)) {
  const body = new URLSearchParams();
  for (const [key, value] of pairs) body.append(key, value);
  return new Request(callbackUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": sig },
    body,
  });
}

beforeEach(() => {
  vi.stubEnv("TWILIO_AUTH_TOKEN", authToken);
  vi.stubEnv("TWILIO_STATUS_WEBHOOK_URL", callbackUrl);
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ not: mocks.not });
  mocks.not.mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table: string) => table === "twilio_message_status_events"
    ? { upsert: mocks.upsert }
    : { update: mocks.update });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Twilio status callback signature", () => {
  const fields: Array<[string, string]> = [
    ["MessageSid", "SM1234567890123456"],
    ["MessageStatus", "delivered"],
    ["Tag", "zeta"],
    ["Tag", "alpha"],
  ];

  it("accepts Twilio's signature when form fields repeat and persists the event", async () => {
    const response = await POST(request(fields));
    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("twilio_message_status_events");
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      message_sid: "SM1234567890123456",
      message_status: "delivered",
    }), { onConflict: "event_key", ignoreDuplicates: true });
    expect(mocks.from).toHaveBeenCalledWith("twilio_sms_requests");
    expect(mocks.not).toHaveBeenCalledWith("status", "in", "(delivered,undelivered,failed,canceled)");
  });

  it("rejects a signature that does not match before writing", async () => {
    const response = await POST(request(fields, "invalid"));
    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("fails closed when signature configuration is missing", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    const response = await POST(request(fields));
    expect(response.status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
