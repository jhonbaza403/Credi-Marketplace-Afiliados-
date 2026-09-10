import { expect, test } from "@playwright/test";

const connectorMatrix = [
  {
    route: "/compras-mayoristas",
    links: ["/proveedores-verificados", "/chat"],
  },
  {
    route: "/proveedores-verificados",
    links: ["/chat", "/compras-mayoristas"],
  },
  {
    route: "/red-comercial",
    links: ["/chat", "/compras-mayoristas", "/proveedores-verificados", "/gestion-empresarial"],
  },
  {
    route: "/sellers",
    links: ["/chat", "/proveedores-verificados", "/compras-mayoristas"],
  },
] as const;

test.describe("Credi connector matrix", () => {
  for (const entry of connectorMatrix) {
    test(`${entry.route} exposes real first-party connectors`, async ({ page }) => {
      const response = await page.goto(entry.route, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${entry.route} returned ${response?.status()}`).toBeTruthy();

      for (const href of entry.links) {
        await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
      }
    });
  }

  test("provider cards generate direct chat and company destinations when data exists", async ({ page }) => {
    await page.goto("/proveedores-verificados", { waitUntil: "domcontentloaded" });
    const cardContacts = page.locator('a[href^="/chat?to="]');
    const companyLinks = page.locator('a[href^="/sellers/"]');
    const cards = await page.locator("article").count();

    if (cards > 0) {
      expect(await cardContacts.count()).toBeGreaterThan(0);
      expect(await companyLinks.count()).toBeGreaterThan(0);
    }
  });

  test("pricing exposes all active commercial plans and checkout forms", async ({ page }) => {
    const response = await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    for (const plan of ["Free", "Creator", "Business", "Enterprise"]) {
      await expect(page.getByRole("heading", { name: plan, exact: true })).toBeVisible();
    }

    await expect(page.locator('form[action="/api/billing/checkout"]')).toHaveCount(6);
    await expect(page.getByRole("button", { name: /Suscribirme mensual/i })).toHaveCount(3);
    await expect(page.getByRole("button", { name: /Suscribirme anual/i })).toHaveCount(3);
  });

  test("protected commercial destinations fail closed to login", async ({ page }) => {
    for (const source of ["/chat", "/gestion-empresarial", "/products/create"]) {
      const response = await page.goto(source, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${source} returned ${response?.status()}`).toBeTruthy();
      expect(new URL(page.url()).pathname).toBe("/login");
    }
  });

  test("private chat media endpoint rejects unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/chat/media?path=unknown");
    expect(response.status()).toBe(401);
  });

  test("legacy seller and jobs connectors remain safe", async ({ page }) => {
    const aliases = [
      ["/seller/b2b", "/b2b"],
      ["/jobs", "/services"],
    ] as const;

    for (const [source, target] of aliases) {
      await page.goto(source, { waitUntil: "domcontentloaded" });
      expect(new URL(page.url()).pathname).toBe(target);
    }
  });
});
