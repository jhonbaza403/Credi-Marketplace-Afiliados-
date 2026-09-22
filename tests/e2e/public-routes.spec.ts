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
      if (response.status() >= 500 && !process.env.PLAYWRIGHT_BASE_URL) test.skip(true, `Local CI route ${route} depends on unavailable production services.`);
      expect(response.status(), `${route} returned an unexpected server error`).toBeLessThan(500);
    });
  }

  test("register rejects an invalid international phone before submission", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    const phone = page.getByLabel("Número telefónico internacional");
    await phone.fill("04121234567");
    expect(await phone.evaluate((el) => (el as HTMLInputElement).validity.patternMismatch)).toBe(true);
    await expect(phone).toHaveAttribute("pattern", /\\\\+[1-9]/);
  });

  test("production health endpoint is reachable", async ({ request }) => {
    const response = await request.get("/api/health", { maxRedirects: 5 });
    const body = await response.json();
    expect(body).toMatchObject({ service: "credi-marketplace" });
    if (process.env.PLAYWRIGHT_BASE_URL) expect(response.status()).toBe(200);
    else expect([200, 503]).toContain(response.status());
  });
});
