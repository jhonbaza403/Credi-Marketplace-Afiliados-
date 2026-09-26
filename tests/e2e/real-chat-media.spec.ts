import { expect, test } from '@playwright/test'

const required = [
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
  'E2E_PEER_EMAIL',
  'E2E_PEER_PASSWORD',
  'E2E_CONVERSATION_ID',
]

const ready = required.every((key) => Boolean(process.env[key]))

test.describe('Credi real chat + audio/video E2E', () => {
  test.skip(!ready, 'Real media E2E requires two dedicated test accounts and E2E_CONVERSATION_ID.')

  test('exchanges a real message and establishes audio and video calls', async ({ browser, baseURL }) => {
    test.skip(!baseURL, 'PLAYWRIGHT_BASE_URL is required for the real production-style E2E.')

    const launch = {
      permissions: ['microphone', 'camera'] as const,
    }

    const caller = await browser.newContext(launch)
    const receiver = await browser.newContext(launch)
    await caller.grantPermissions(['microphone', 'camera'])
    await receiver.grantPermissions(['microphone', 'camera'])

    const login = async (page: import('@playwright/test').Page, email: string, password: string) => {
      await page.goto('/login?next=/chat', { waitUntil: 'domcontentloaded' })
      await page.getByLabel('Correo electrónico').fill(email)
      await page.getByLabel('Contraseña').fill(password)
      await page.getByRole('button', { name: 'Ingresar al portal' }).click()
      await page.waitForURL(/\/chat(?:\?|$)/)
    }

    const a = await caller.newPage()
    const b = await receiver.newPage()

    try {
      await Promise.all([
        login(a, process.env.E2E_USER_EMAIL!, process.env.E2E_USER_PASSWORD!),
        login(b, process.env.E2E_PEER_EMAIL!, process.env.E2E_PEER_PASSWORD!),
      ])

      const conversation = process.env.E2E_CONVERSATION_ID!
      await Promise.all([
        a.goto(`/chat?conversation=${encodeURIComponent(conversation)}`, { waitUntil: 'domcontentloaded' }),
        b.goto(`/chat?conversation=${encodeURIComponent(conversation)}`, { waitUntil: 'domcontentloaded' }),
      ])

      const marker = `E2E-CREDI-${Date.now()}`
      await a.getByPlaceholder('Escribe un mensaje comercial…').fill(marker)
      await a.getByRole('button', { name: 'Enviar mensaje' }).click()
      await expect(b.getByText(marker, { exact: true })).toBeVisible({ timeout: 15000 })

      await a.getByRole('button', { name: 'Llamada de voz' }).click()
      await expect(b.getByRole('button', { name: 'Aceptar' })).toBeVisible({ timeout: 15000 })
      await b.getByRole('button', { name: 'Aceptar' }).click()
      await expect(a.getByText('Conectado')).toBeVisible({ timeout: 20000 })
      await expect(b.getByText('Conectado')).toBeVisible({ timeout: 20000 })
      await a.getByRole('button', { name: 'Finalizar llamada' }).click()

      await a.getByRole('button', { name: 'Videollamada' }).click()
      await expect(b.getByRole('button', { name: 'Aceptar' })).toBeVisible({ timeout: 15000 })
      await b.getByRole('button', { name: 'Aceptar' }).click()
      await expect(a.getByText('Conectado')).toBeVisible({ timeout: 20000 })
      await expect(b.getByText('Conectado')).toBeVisible({ timeout: 20000 })
      await expect(a.locator('video')).toHaveCount(2)
      await expect(b.locator('video')).toHaveCount(2)
      await a.getByRole('button', { name: 'Finalizar llamada' }).click()
    } finally {
      await caller.close()
      await receiver.close()
    }
  })
})
