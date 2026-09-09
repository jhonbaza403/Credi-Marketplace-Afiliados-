import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/marketplace",
  "/products",
  "/services",
  "/affiliate",
  "/b2b",
  "/sellers",
  "/seller",
  "/search",
  "/account",
  "/orders",
] as const;

test.describe("Public navigation", () => {
  for (const route of publicRoutes) {
    test(`${route} returns a successful page response`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response, `No HTTP response for ${route}`).not.toBeNull();
      expect(response?.ok(), `${route} returned ${response?.status()}`).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
    });
  }

  test("home exposes the real logo and service navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const logo = page.locator('header img[alt="Credi Marketplace"]').first();
    await expect(logo).toBeVisible();

    const services = page.getByRole("link", { name: "Servicios" }).first();
    await expect(services).toHaveAttribute("href", "/services");
  });

  test("services page exposes only valid first-party destinations", async ({ page }) => {
    await page.goto("/services", { waitUntil: "domcontentloaded" });

    const serviceLinks = page.getByRole("link", { name: /Abrir servicio/i });
    await expect(serviceLinks).toHaveCount(4);

    for (const link of await serviceLinks.all()) {
      await expect(link).not.toHaveAttribute("href", /^(https?:|mailto:|#)/i);
    }
  });
});
