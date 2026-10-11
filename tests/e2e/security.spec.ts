import { expect, test } from '@playwright/test';

test.describe('Account security', () => {
  test('security page requires authentication', async ({ page }) => {
    const response = await page.goto('/security', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    expect(new URL(page.url()).pathname).toBe('/login');
    expect(new URL(page.url()).searchParams.get('next')).toBe('/security');
  });

  test('login exposes an accessible passkey entry', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();

    // Confirm the route rendered the real login form before checking the optional
    // WebAuthn entry; this makes failures distinguish a broken route from a
    // missing/inaccessible passkey control.
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    const passkeyButton = page.getByTestId('passkey-login-button');
    await expect(passkeyButton).toBeVisible();
    await expect(passkeyButton).toHaveAccessibleName('Entrar con llave de acceso');
  });
});
