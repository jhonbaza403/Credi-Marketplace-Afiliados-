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
    const body = await response.json()
    if (!process.env.PLAYWRIGHT_BASE_URL && response.status() === 503) {
      expect(body).toMatchObject({ error: 'JOBS_SERVICE_UNAVAILABLE', code: 'DEPENDENCY_UNAVAILABLE' })
      return
    }
    expect(response.status()).toBe(200)
    expect(Array.isArray(body.jobs)).toBe(true)
  })
})
