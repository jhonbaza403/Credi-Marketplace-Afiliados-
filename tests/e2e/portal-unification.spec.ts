import { expect, test } from "@playwright/test";

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

    const homeTitle = page.getByRole("heading", { name: /Personas, contenido y oportunidades/i });
    await expect(homeTitle).toBeVisible();
    await expect.poll(async () => homeTitle.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(255, 255, 255)");

    const mainHeadline = homeTitle.locator(".hero-main-text");
    const highlightedHeadline = homeTitle.locator(".hero-highlight");
    const homepageSubtitle = page.locator(".hero-description");
    await expect(mainHeadline).toBeVisible();
    await expect(highlightedHeadline).toBeVisible();
    await expect(homepageSubtitle).toBeVisible();
    await expect.poll(async () => mainHeadline.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(255, 255, 255)");
    await expect.poll(async () => highlightedHeadline.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(103, 232, 249)");
    await expect.poll(async () => homepageSubtitle.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(241, 245, 249)");

    const footerTitle = page.getByRole("heading", { name: "Confianza, comercio y conexión" });
    await expect(footerTitle).toBeVisible();
    await expect.poll(async () => footerTitle.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(255, 255, 255)");

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
