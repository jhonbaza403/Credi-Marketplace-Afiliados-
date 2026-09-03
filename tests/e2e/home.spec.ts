import { expect, test } from "@playwright/test";

test.describe("Home", () => {
  test("loads successfully and exposes the application title", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });

    expect(response, "The home route must return an HTTP response.").not.toBeNull();
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/Credi Marketplace/i);
  });

  test("supports a clean browser navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});
