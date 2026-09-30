import { expect, test } from "@playwright/test";

test.describe("Credi AI API", () => {
  test("requires authentication", async ({ request }) => {
    const response = await request.post("/api/ai", {
      data: { prompt: "Dame una idea comercial", mode: "copilot" },
    });
    expect(response.status()).toBe(401);
  });

  test("rejects malformed requests", async ({ request }) => {
    const response = await request.post("/api/ai", {
      data: { prompt: "", mode: "unknown" },
    });
    expect([400, 401]).toContain(response.status());
  });

  test("does not expose API-key shaped secrets", async ({ request }) => {
    const response = await request.post("/api/ai", {
      data: { prompt: "test", mode: "copilot" },
    });
    const body = await response.text();
    expect(body).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);
  });
});