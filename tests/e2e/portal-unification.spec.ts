import { expect, test, type Locator } from "@playwright/test";

type CssColor = { red: number; green: number; blue: number; alpha: number };

function parseCssColors(value: string): CssColor[] {
  const colors: CssColor[] = [];
  for (const match of value.matchAll(/rgba?\\(([^)]+)\\)/g)) {
    const parts = match[1].replace(/\\//g, " ").match(/[\\d.]+%?/g) ?? [];
    if (parts.length < 3) continue;
    const channel = (part: string) => {
      const number = Number.parseFloat(part);
      return part.endsWith("%") ? number * 2.55 : number;
    };
    const alphaPart = parts[3];
    const alpha = alphaPart === undefined ? 1
      : alphaPart.endsWith("%") ? Number.parseFloat(alphaPart) / 100
      : Number.parseFloat(alphaPart);
    colors.push({
      red: Math.min(255, Math.max(0, channel(parts[0]))),
      green: Math.min(255, Math.max(0, channel(parts[1]))),
      blue: Math.min(255, Math.max(0, channel(parts[2]))),
      alpha: Math.min(1, Math.max(0, alpha)),
    });
  }
  return colors;
}

function parseHexColor(value: string): CssColor | null {
  const match = value.trim().match(/^#([\\da-f]{3}|[\\da-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split("").map((part) => part + part).join("")
    : match[1];
  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
    alpha: 1,
  };
}

function composite(foreground: CssColor, background: CssColor): CssColor {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  return {
    red: (foreground.red * foreground.alpha + background.red * background.alpha * (1 - foreground.alpha)) / alpha,
    green: (foreground.green * foreground.alpha + background.green * background.alpha * (1 - foreground.alpha)) / alpha,
    blue: (foreground.blue * foreground.alpha + background.blue * background.alpha * (1 - foreground.alpha)) / alpha,
    alpha,
  };
}

function relativeLuminance(color: CssColor): number {
  const linear = [color.red, color.green, color.blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

async function expectReadableContrast(element: Locator) {
  await expect.poll(async () => element.evaluate((node) => {
    const foreground = parseCssColors(getComputedStyle(node).color)[0];
    if (!foreground) return -1;

    const root = getComputedStyle(document.documentElement);
    const themeBackground = parseHexColor(root.getPropertyValue("--background"));
    const layers: CssColor[] = themeBackground ? [themeBackground] : [];

    const ancestors: HTMLElement[] = [];
    for (let current = node as HTMLElement | null; current; current = current.parentElement) {
      ancestors.push(current);
    }

    for (const current of ancestors.reverse()) {
      const style = getComputedStyle(current);
      layers.push(...parseCssColors(style.backgroundColor));
      layers.push(...parseCssColors(style.backgroundImage));
    }

    const opaqueBackgrounds = layers.filter((color) => color.alpha >= 0.999);
    if (opaqueBackgrounds.length === 0) return -1;

    // Include translucent gradient stops composited over each opaque surface
    // token/stop found on the element and its ancestors.
    const backgrounds = [...opaqueBackgrounds];
    for (const layer of layers.filter((color) => color.alpha < 0.999)) {
      for (const base of opaqueBackgrounds) backgrounds.push(composite(layer, base));
    }

    const ratios = backgrounds.map((background) => {
      const visibleForeground = foreground.alpha < 0.999
        ? composite(foreground, background)
        : foreground;
      const foregroundLuminance = relativeLuminance(visibleForeground);
      const backgroundLuminance = relativeLuminance(background);
      const lighter = Math.max(foregroundLuminance, backgroundLuminance);
      const darker = Math.min(foregroundLuminance, backgroundLuminance);
      return (lighter + 0.05) / (darker + 0.05);
    });

    return Math.min(...ratios);
  })).toBeGreaterThanOrEqual(4.5);
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
    const wallTitle = page.getByRole("heading", { name: /Tu comunidad\\. Tus ideas\\. Nuevas oportunidades\\./i });
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
    await expect(page).toHaveURL(/\\/free$/);
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
    await expect(page.getByRole("heading", { name: /Tu comunidad\\. Tus ideas\\. Nuevas oportunidades\\./i })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Marketplace", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Free", exact: true })).toBeVisible();
  });
});
