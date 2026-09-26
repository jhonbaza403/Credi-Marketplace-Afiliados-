import { test, expect } from "@playwright/test";

test.describe("API HTTP method and auth contracts", () => {
  test("health endpoint accepts GET/HEAD and rejects unsupported POST/PUT", async ({ request }) => {
    const getResponse = await request.get("/api/health");
    expect([200, 503]).toContain(getResponse.status());

    const headResponse = await request.head("/api/health");
    expect([200, 503]).toContain(headResponse.status());

    const postResponse = await request.post("/api/health");
    expect(postResponse.status()).toBe(405);
    expect(postResponse.headers()["allow"] ?? "").toContain("GET");

    const putResponse = await request.put("/api/health");
    expect(putResponse.status()).toBe(405);
  });

  test("unknown API route returns a real 404", async ({ request }) => {
    const response = await request.get("/api/__contract_test_missing__");
    expect(response.status()).toBe(404);
  });

  test("products endpoint exposes GET/HEAD and rejects mutations", async ({ request }) => {
    const getResponse = await request.get("/api/products");
    expect([200, 503]).toContain(getResponse.status());

    const postResponse = await request.post("/api/products");
    expect(postResponse.status()).toBe(405);
    expect(postResponse.headers()["allow"] ?? "").toContain("GET");
  });

  test("protected catalog endpoint fails closed without a session", async ({ request }) => {
    const response = await request.get("/api/catalog");
    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"] ?? "").toContain("application/json");
  });

  test("protected B2B access endpoint fails closed without a session", async ({ request }) => {
    const getResponse = await request.get("/api/b2b/access");
    expect(getResponse.status()).toBe(401);

    const postResponse = await request.post("/api/b2b/access");
    expect(postResponse.status()).toBe(405);
    expect(postResponse.headers()["allow"] ?? "").toContain("GET");
  });
});
