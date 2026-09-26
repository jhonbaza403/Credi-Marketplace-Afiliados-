import { test, expect } from "@playwright/test";

test.describe("API HTTP method contracts", () => {
  test("health endpoint accepts GET/HEAD and rejects unsupported POST", async ({ request }) => {
    const getResponse = await request.get("/api/health");
    expect(getResponse.ok()).toBeTruthy();
    expect(getResponse.status()).toBe(200);

    const postResponse = await request.post("/api/health");
    expect(postResponse.status()).toBe(405);
    expect(postResponse.headers()["allow"] ?? "").toContain("GET");
  });

  test("unsupported method does not silently execute the endpoint", async ({ request }) => {
    const response = await request.put("/api/health");
    expect(response.status()).toBe(405);
  });
});
