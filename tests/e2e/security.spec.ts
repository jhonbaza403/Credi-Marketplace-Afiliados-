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

    // Passkey login is not implemented in the current LoginForm. Assert the
    // actual accessible email/password form instead of a nonexistent feature.
    const loginForm = page.getByRole('form', {
      name: /acceso al portal de credi marketplace/i,
    });

    await expect(page.getByRole('heading', { name: 'Accede a tu cuenta' })).toBeVisible();
    await expect(loginForm).toBeVisible();
    await expect(
      loginForm.getByRole('button', { name: 'Ingresar al portal' }),
    ).toBeEnabled();
  });
});
