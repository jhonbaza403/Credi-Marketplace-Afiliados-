import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  gte: vi.fn(),
  insert: vi.fn(),
  single: vi.fn(),
  fetch: vi.fn(),
  distributedRateLimit: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
}));
vi.mock("@/lib/security/rate-limit", () => ({
  distributedRateLimit: mocks.distributedRateLimit,
}));

import { POST } from "@/app/api/communications/sms/route";

const user = {
  id: "user-123",
  phone: "+15555550123",
  phone_confirmed_at: "2026-01-01T00:00:00.000Z",
};

function request(idempotencyKey = "b8c9f08e-1f2e-4e9f-9c34-90f0e1f5e001") {
  return new Request("https://example.test/api/communications/sms", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.test" },
    body: JSON.stringify({ idempotencyKey }),
  });
}

beforeEach(() => {
  vi.stubEnv("TWILIO_ACCOUNT_SID", `AC${"a".repeat(32)}`);
  vi.stubEnv("TWILIO_API_KEY_SID", `SK${"b".repeat(32)}`);
  vi.stubEnv("TWILIO_API_KEY_SECRET", "test-secret");
  vi.stubEnv("TWILIO_FROM_NUMBER", "+15555550999");
  vi.stubEnv("TWILIO_STATUS_WEBHOOK_URL", "https://example.test/api/status");
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.gte.mockResolvedValue({ count: 0, error: null });
  mocks.distributedRateLimit.mockResolvedValue({ success: true, limit: 3, remaining: 2, resetAt: Date.now() + 3_600_000 });
  mocks.single.mockResolvedValue({ data: { id: "request-1" }, error: null });
  mocks.insert.mockReturnThis();
  mocks.from.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: mocks.gte,
    maybeSingle: mocks.maybeSingle,
    insert: mocks.insert,
    single: mocks.single,
  }));
  vi.stubGlobal("fetch", mocks.fetch);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SMS idempotency and per-user quota", () => {
  it("returns 409 for an existing user-scoped idempotency key before checking quota or sending", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "already-sent" }, error: null });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "duplicate_request" });
    expect(mocks.distributedRateLimit).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejects a fourth request in the rolling hour before inserting or sending", async () => {
    mocks.distributedRateLimit.mockResolvedValue({ success: false, limit: 3, remaining: 0, resetAt: Date.now() + 3_600_000 });

    const response = await POST(request("c9d0f08e-1f2e-4e9f-9c34-90f0e1f5e002"));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "sms_hourly_limit_reached" });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin browser request before authentication or sending", async () => {
    const response = await POST(new Request("https://example.test/api/communications/sms", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://attacker.example" },
      body: JSON.stringify({ idempotencyKey: "c9d0f08e-1f2e-4e9f-9c34-90f0e1f5e002" }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
