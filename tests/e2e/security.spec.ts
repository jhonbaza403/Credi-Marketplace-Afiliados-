import { expect, test } from '@playwright/test';

test.describe('Account security', () => {
  test('security page requires authentication', async ({ page }) => {
    const response = await page.goto('/security', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    expect(new URL(page.url()).pathname).toBe('/login');
    expect(new URL(page.url()).searchParams.get('next')).toBe('/security');
  });

  test('login renders a usable authentication entry point', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // The login UI may label the passkey action differently across locales.
    // Still require a real, visible control; never pass when the page is empty.
    const passkeyButton = page.getByRole('button', {
      name: /entrar con llave de acceso|passkey|llave de acceso/i,
    });
    const loginForm = page.locator(
      '[data-testid="login-form"], form[aria-label*="login" i], form[aria-label*="inicio" i]',
    );

    await expect
      .poll(async () => {
        return (
          (await passkeyButton.isVisible().catch(() => false)) ||
          (await loginForm.isVisible().catch(() => false))
        );
      }, { timeout: 10_000 })
      .toBe(true);

    if (await passkeyButton.isVisible().catch(() => false)) {
      await expect(passkeyButton).toBeEnabled();
    } else {
      await expect(loginForm).toBeVisible();
    }
  });
});
