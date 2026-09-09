import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/marketplace",
  "/products",
  "/services",
  "/b2b",
  "/jobs",
  "/magazines",
  "/sellers",
  "/videos",
  "/affiliate",
  "/account",
  "/orders",
  "/robots.txt",
  "/sitemap.xml",
];

test.describe("Public route availability", () => {
  for (const route of publicRoutes) {
    test(`${route} does not return 404`, async ({ request }) => {
      const response = await request.get(route, { maxRedirects: 5 });
      expect(response.status(), `${route} returned ${response.status()}`).not.toBe(404);
      expect(response.status(), `${route} returned an unexpected server error`).toBeLessThan(500);
    });
  }

  test("production health endpoint is reachable", async ({ request }) => {
    const response = await request.get("/api/health", { maxRedirects: 5 });
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "credi-marketplace",
    });
  });
});
