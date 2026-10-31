import { expect, test } from '@playwright/test'

test.describe('Credi professional opportunities portal', () => {
  test('jobs page is a real portal and not a redirect to services', async ({ page }) => {
    await page.goto('/jobs')
    await expect(page).toHaveURL(/\/jobs$/)
    await expect(page.getByRole('heading', { name: /Talento, empresas y nuevas oportunidades/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Publicar vacante' })).toHaveAttribute('href', '/jobs/create')
    await expect(page.getByRole('link', { name: /Mi perfil profesional/i })).toHaveAttribute('href', '/jobs/profile')
  })

  test('public opportunities endpoint responds without authentication', async ({ request }) => {
    const response = await request.get('/api/jobs')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body.jobs)).toBe(true)
  })
})
