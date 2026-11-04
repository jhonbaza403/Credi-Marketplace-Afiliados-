import { expect, test, type Locator } from "@playwright/test";
import sharp from "sharp";

async function expectReadableContrast(element: Locator) {
  const marker = "credi-contrast-probe";
  const selector = `[data-credi-contrast-probe="${marker}"]`;
  await element.scrollIntoViewIfNeeded();
  await element.evaluate((node, value) => node.setAttribute("data-credi-contrast-probe", value), marker);

  try {
    const actualPng = await element.screenshot({ animations: "disabled", scale: "css" });
    const markerPng = await element.screenshot({
      animations: "disabled",
      scale: "css",
      style: `${selector}, ${selector} * {
        color: rgb(255 0 255) !important;
        -webkit-text-fill-color: rgb(255 0 255) !important;
        background-image: none !important;
        text-shadow: none !important;
        text-decoration-color: rgb(255 0 255) !important;
      }`,
    });
    const backgroundPng = await element.screenshot({
      animations: "disabled",
      scale: "css",
      style: `${selector}, ${selector} * {
        color: transparent !important;
        -webkit-text-fill-color: transparent !important;
        background-image: none !important;
        text-shadow: none !important;
        text-decoration-color: transparent !important;
      }`,
    });

    const decode = async (png: Buffer) => sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const [actual, markerImage, background] = await Promise.all([
      decode(actualPng),
      decode(markerPng),
      decode(backgroundPng),
    ]);

    for (const image of [markerImage, background]) {
      expect(image.info.width, "Contrast probe screenshot widths must match").toBe(actual.info.width);
      expect(image.info.height, "Contrast probe screenshot heights must match").toBe(actual.info.height);
    }

    const relativeLuminance = (red: number, green: number, blue: number) => {
      const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
    };

    const ratios: number[] = [];
    const actualPixels = actual.data;
    const markerPixels = markerImage.data;
    const backgroundPixels = background.data;

    for (let offset = 0; offset < actualPixels.length; offset += 4) {
      const bg = [backgroundPixels[offset], backgroundPixels[offset + 1], backgroundPixels[offset + 2]];
      const mark = [markerPixels[offset], markerPixels[offset + 1], markerPixels[offset + 2]];
      const observed = [actualPixels[offset], actualPixels[offset + 1], actualPixels[offset + 2]];
      const alphaCandidates: number[] = [];

      if (255 - bg[0] > 8) alphaCandidates.push((mark[0] - bg[0]) / (255 - bg[0]));
      if (bg[1] > 8) alphaCandidates.push((bg[1] - mark[1]) / bg[1]);
      if (255 - bg[2] > 8) alphaCandidates.push((mark[2] - bg[2]) / (255 - bg[2]));

      if (alphaCandidates.length === 0) continue;
      const sortedAlpha = alphaCandidates
        .map((value) => Math.min(1, Math.max(0, value)))
        .sort((left, right) => left - right);
      const alpha = sortedAlpha[Math.floor(sortedAlpha.length / 2)];

      // Ignore antialiased edge pixels: use the interior of the glyph mask to
      // reconstruct the visible text color against the rendered background.
      if (alpha < 0.65) continue;

      const foreground = observed.map((value, channel) =>
        Math.min(255, Math.max(0, (value - bg[channel] * (1 - alpha)) / alpha)),
      );
      const foregroundLuminance = relativeLuminance(foreground[0], foreground[1], foreground[2]);
      const backgroundLuminance = relativeLuminance(bg[0], bg[1], bg[2]);
      const lighter = Math.max(foregroundLuminance, backgroundLuminance);
      const darker = Math.min(foregroundLuminance, backgroundLuminance);
      ratios.push((lighter + 0.05) / (darker + 0.05));
    }

    expect(ratios.length, "The rendered heading must contain measurable text pixels").toBeGreaterThan(0);
    const minimumContrast = Math.min(...ratios);
    expect(
      minimumContrast,
      `Rendered text/background contrast must meet WCAG AA 4.5:1; measured minimum ${minimumContrast.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);
  } finally {
    await element.evaluate((node) => node.removeAttribute("data-credi-contrast-probe"));
  }
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
    await expectReadableContrast(homeTitle);
    const footerTitle = page.getByRole("heading", { name: "Legal y seguridad" });
    await expect(footerTitle).toBeVisible();
    await expectReadableContrast(footerTitle);

    await page.goto("/social");
    const wallTitle = page.getByRole("heading", { name: /Tu comunidad\. Tus ideas\. Nuevas oportunidades\./i });
    await expect(wallTitle).toBeVisible();
    await expectReadableContrast(wallTitle);
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
    for (const href of requiredPaths) expect(actualPaths, "Missing menu destination: " + href).toContain(href);
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
