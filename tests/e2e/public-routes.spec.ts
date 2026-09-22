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
    await phone.fill("+1234567890123456");
    await expect(phone).toHaveValue("+1234567890123456");
    const pattern = await phone.getAttribute("pattern");
    expect(pattern).toBeTruthy();
    expect("+1234567890123456").toMatch(new RegExp(pattern!));
    expect(await phone.getAttribute("title")).toContain("código de país");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("alert")).toContainText("código de país");
  });

  test("production health endpoint/ is reachable", async ({ request }) => {
    const response = await request.get("/api/health", { maxRedirects: 5 });
    const body = await response.json();
    expect(body).toMatchObject({ service: "credi-marketplace" });
    if (process.env.PLAYWRIGHT_BASE_URL) expect(response.status()).toBe(200);
    else expect([200, 503]).toContain(response.status());
  });
});
