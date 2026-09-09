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
  "/social",
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

  test("login exposes the email field with accessible semantics", async ({ page }) => {
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    const email = page.getByLabel("Correo electrónico");
    await expect(email).toHaveAttribute("type", "email");
    await expect(email).toHaveAttribute("autocomplete", "email");
    await expect(email).toHaveAttribute("aria-required", "true");
  });

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

  test("products expose universal sharing controls", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });

    const share = page.getByRole("heading", { name: "Haz viral este producto" }).first();
    const bodyText = await page.locator("body").innerText();

    if (bodyText.includes("No existen productos disponibles.")) {
      await expect(share).toHaveCount(0);
      return;
    }

    await expect(share).toBeVisible();
    for (const label of ["Compartir por WhatsApp", "Compartir en Facebook", "Compartir en X", "Compartir en Telegram", "Compartir en Pinterest"]) {
      await expect(page.getByRole("button", { name: label }).first()).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Copiar enlace viral" }).first()).toBeVisible();
  });

  test("legacy and protected aliases resolve safely", async ({ page }) => {
    const aliases = [
      ["/dashboard/orders", "/login"],
      ["/dashboard/profile", "/login"],
      ["/jobs", "/services"],
      ["/seller/b2b", "/b2b"],
      ["/products/create", "/login"],
      ["/publish", "/login"],
    ] as const;

    for (const [source, target] of aliases) {
      const response = await page.goto(source, { waitUntil: "domcontentloaded" });
      expect(response, `No HTTP response for ${source}`).not.toBeNull();
      expect(response?.ok(), `${source} returned ${response?.status()}`).toBeTruthy();
      expect(new URL(page.url()).pathname).toBe(target);
    }
  });
});
