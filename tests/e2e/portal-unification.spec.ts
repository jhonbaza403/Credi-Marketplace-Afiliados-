import { expect, test, type Locator } from "@playwright/test";

async function expectReadableLightText(element: Locator) {
  await expect.poll(async () => element.evaluate((node) => {
    const color = getComputedStyle(node).color;
    const values = color.match(/[\\d.]+/g)?.map(Number).filter(Number.isFinite) ?? [];
    if (values.length < 3) return -1;
    const channels = values.slice(0, 3).map((value) => value > 1 ? value / 255 : value);
    const luminance = channels.map((channel) => {
      const value = Math.min(1, Math.max(0, channel));
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * luminance[0] + 0.7152 * luminance[1] + 0.0722 * luminance[2];
  })).toBeGreaterThan(0.8);
}

test.describe("Credi unified portal", () => {
  test("primary navigation has readable social-portal links", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    const expected = [
      ["Inicio", "/"],
      ["Muro", "/social"],
      ["Marketplace", "/marketplace"],
      ["Servicios", "/services"],
      ["Free", "/free"],
      ["LIVE", "/live"],
    ] as const;

    for (const [label, href] of expected) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
    }

    const homeTitle = page.getByRole("heading", { name: /Todo lo que necesitas para conectar, compartir y crecer/i });
    await expect(homeTitle).toBeVisible();
    await expect.poll(async () => homeTitle.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(255, 255, 255)");
    const footerTitle = page.getByRole("heading", { name: "Legal y seguridad" });
    await expect(footerTitle).toBeVisible();
    await expectReadableLightText(footerTitle);

    await page.goto("/social");
    const wallTitle = page.getByRole("heading", { name: /Tu comunidad\. Tus ideas\. Nuevas oportunidades\./i });
    await expect(wallTitle).toBeVisible();
    await expect.poll(async () => wallTitle.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(255, 255, 255)");
  });

  test("solutions menu exposes implemented first-party destinations", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await nav.getByRole("button", { name: /Soluciones/ }).click();
    const menu = page.locator("#credi-solutions-menu");
    await expect(menu).toBeVisible();

    const requiredPaths = [
      "/historias", "/videos", "/chat", "/live", "/marketplace", "/b2b", "/publish",
      "/services", "/affiliate", "/proveedores-verificados", "/catalogo-video",
      "/dashboard/b2b", "/marketing", "/analytics", "/inventario", "/pagos",
      "/wallet", "/intelligence", "/security",
    ];
    const actualPaths = await menu.locator("a[href]").evaluateAll((links) =>
      links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
    );
    for (const href of requiredPaths) expect(actualPaths, `Missing menu destination: ${href}`).toContain(href);
  });

  test("home exposes the canonical portal navigation", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    for (const label of ["Inicio", "Muro", "Marketplace", "Servicios", "Free"]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("free is a hub inside the same portal", async ({ page }) => {
    await page.goto("/free");
    await expect(page).toHaveURL(/\/free$/);
    await expect(page.getByRole("heading", { name: /Un solo lugar para descubrir/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Entrar al Muro/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Explorar Marketplace/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver planes/i })).toBeVisible();
  });

  test("legacy entry points preserve canonical destinations and auth guard", async ({ page }) => {
    await page.goto("/explorar");
    expect(new URL(page.url()).pathname).toBe("/marketplace");

    await page.goto("/servicios");
    expect(new URL(page.url()).pathname).toBe("/services");

    await page.goto("/vender");
    const venderUrl = new URL(page.url());
    expect(venderUrl.pathname).toBe("/login");
    expect(venderUrl.searchParams.get("next")).toBe("/publish");
  });

  test("domains expose natural continuation paths without a second portal", async ({ page }) => {
    await page.goto("/marketplace");
    const mainNav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(mainNav.getByRole("link", { name: "Publicar", exact: true })).toHaveAttribute("href", "/publish");

    const continuation = page.getByRole("navigation", { name: "Continuar en Credi" });
    await expect(continuation.locator('a[href="/chat"]').first()).toHaveAttribute("href", "/chat");
    await expect(continuation.locator('a[href="/affiliate"]').first()).toHaveAttribute("href", "/affiliate");

    await page.goto("/services");
    const serviceContinuation = page.getByRole("navigation", { name: "Continuar en Credi" });
    await expect(serviceContinuation.locator('a[href="/marketplace"]').first()).toHaveAttribute("href", "/marketplace");
    await expect(serviceContinuation.locator('a[href="/chat"]').first()).toHaveAttribute("href", "/chat");
  });

  test("wall keeps social and commerce navigation connected", async ({ page }) => {
    await page.goto("/social");
    await expect(page.getByRole("heading", { name: /Tu comunidad\. Tus ideas\. Nuevas oportunidades\./i })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Marketplace", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Free", exact: true })).toBeVisible();
  });
});
