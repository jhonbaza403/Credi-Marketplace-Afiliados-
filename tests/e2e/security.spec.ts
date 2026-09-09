import { expect, test } from '@playwright/test';

test.describe('Account security', () => {
  test('security page requires authentication', async ({ page }) => {
    const response = await page.goto('/security', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    expect(new URL(page.url()).pathname).toBe('/login');
    expect(new URL(page.url()).searchParams.get('next')).toBe('/security');
  });

  test('login exposes passkey entry', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Entrar con llave de acceso' })).toBeVisible();
  });
});
