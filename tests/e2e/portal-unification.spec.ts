import { expect, test } from "@playwright/test";

test.describe("Credi unified portal", () => {
  test("home exposes the canonical portal navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Inicio" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Muro" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Marketplace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Servicios" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Free" })).toBeVisible();
  });

  test("free is a hub inside the same portal", async ({ page }) => {
    await page.goto("/free");
    await expect(page.getByRole("heading", { name: /Un solo lugar para descubrir/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Entrar al Muro/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Explorar Marketplace/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver planes/i })).toBeVisible();
  });

  test("legacy entry points converge on canonical domains", async ({ page }) => {
    await page.goto("/explorar");
    await expect(page).toHaveURL(/\/marketplace$/);
    await page.goto("/servicios");
    await expect(page).toHaveURL(/\/services$/);
    await page.goto("/vender");
    await expect(page).toHaveURL(/\/publish$/);
  });

  test("wall keeps social and commerce navigation connected", async ({ page }) => {
    await page.goto("/social");
    await expect(page.getByRole("heading", { name: /Descubre lo que está pasando/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Marketplace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Free" })).toBeVisible();
  });
});
