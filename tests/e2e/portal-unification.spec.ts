import { expect, test } from "@playwright/test";

test.describe("Credi unified portal", () => {
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

  test("legacy entry points converge on canonical domains", async ({ request }) => {
    const aliases = [
      ["/explorar", "/marketplace"],
      ["/servicios", "/services"],
      ["/vender", "/publish"],
    ] as const;

    for (const [source, target] of aliases) {
      const response = await request.get(source, { maxRedirects: 0 });
      expect([301, 302, 303, 307, 308]).toContain(response.status());
      expect(response.headers().location ?? "").toBe(target);
    }
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
    await expect(page.getByRole("heading", { name: /Descubre lo que está pasando/i })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Marketplace", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Free", exact: true })).toBeVisible();
  });
});
