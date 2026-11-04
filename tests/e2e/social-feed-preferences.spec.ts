import { expect, test } from '@playwright/test'

const ready = Boolean(
  process.env.PLAYWRIGHT_BASE_URL &&
  process.env.E2E_SOCIAL_TEST_EMAIL &&
  process.env.E2E_SOCIAL_TEST_PASSWORD,
)

test.describe('Credi social-feed preference controls', () => {
  test.skip(!ready, 'Requires dedicated E2E_SOCIAL_TEST_EMAIL and E2E_SOCIAL_TEST_PASSWORD credentials.')

  test('saves explicit interests and allows restoring chronological mode', async ({ page }) => {
    await page.goto('/login?next=/social', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Correo electrónico').fill(process.env.E2E_SOCIAL_TEST_EMAIL!)
    await page.getByLabel('Contraseña').fill(process.env.E2E_SOCIAL_TEST_PASSWORD!)
    await page.getByRole('button', { name: 'Ingresar al portal' }).click()
    await page.waitForURL(/\/social(?:\?|$)/)

    await expect(page.getByRole('region', { name: 'Preferencias del Muro' })).toBeVisible()
    await page.getByRole('checkbox', { name: 'Tecnología' }).check()
    await page.getByRole('button', { name: 'Por mis intereses' }).click()
    await page.getByRole('button', { name: 'Guardar preferencias' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Preferencias guardadas' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('checkbox', { name: 'Tecnología' })).toBeChecked()
    await page.getByRole('button', { name: 'Restablecer' }).click()
    await expect(page.getByRole('button', { name: 'Más recientes' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('checkbox', { name: 'Tecnología' })).not.toBeChecked()
  })
})
