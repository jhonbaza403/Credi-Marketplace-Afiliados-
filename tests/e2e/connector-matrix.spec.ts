import { expect, test } from "@playwright/test";

const connectorMatrix = [
  {
    route: "/compras-mayoristas",
    links: [
      ["Proveedores verificados", "/proveedores-verificados"],
      ["Credi Business Chat", "/chat"],
    ],
  },
  {
    route: "/proveedores-verificados",
    links: [
      ["Contactar", "/chat?to="],
      ["Ver empresa", "/sellers/"],
    ],
  },
  {
    route: "/red-comercial",
    links: [
      ["Credi Chat", "/chat"],
      ["Compras mayoristas", "/compras-mayoristas"],
      ["Proveedores verificados", "/proveedores-verificados"],
      ["Gestión empresarial", "/gestion-empresarial"],
    ],
  },
  {
    route: "/sellers",
    links: [
      ["Contactar", "/chat?to="],
      ["Ver empresa", "/sellers/"],
      ["Proveedores verificados", "/proveedores-verificados"],
      ["Compras mayoristas", "/compras-mayoristas"],
    ],
  },
] as const;

test.describe("Credi connector matrix", () => {
  for (const entry of connectorMatrix) {
    test(`${entry.route} exposes real first-party connectors`, async ({ page }) => {
      const response = await page.goto(entry.route, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${entry.route} returned ${response?.status()}`).toBeTruthy();

      for (const [label, href] of entry.links) {
        const link = page.getByRole("link", { name: new RegExp(label, "i") }).first();
        await expect(link, `${entry.route} is missing connector ${label}`).toBeVisible();
        await expect(link).toHaveAttribute("href", new RegExp(`^${escapeRegExp(href)}`));
      }
    });
  }

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
