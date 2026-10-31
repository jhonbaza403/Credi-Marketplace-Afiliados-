import { expect, test } from '@playwright/test'

const pins = (process.env.E2E_GROUP_MEMBER_PINS ?? '')
  .split(',')
  .map(value => value.trim().toUpperCase())
  .filter(Boolean)
const memberPins = [...new Set(pins)].slice(0, 2)
const inviteePin = (process.env.E2E_GROUP_ACCEPT_PIN ?? '').trim().toUpperCase()

const ready = Boolean(
  process.env.PLAYWRIGHT_BASE_URL &&
  process.env.E2E_USER_EMAIL &&
  process.env.E2E_USER_PASSWORD &&
  process.env.E2E_GROUP_ACCEPT_EMAIL &&
  process.env.E2E_GROUP_ACCEPT_PASSWORD &&
  memberPins.length === 2 &&
  memberPins.includes(inviteePin),
)

test.describe('Credi Chat private group invitations', () => {
  test.skip(!ready, 'Requires a dedicated creator account, invitee account, two matching test PINs and PLAYWRIGHT_BASE_URL.')

  test('invitee must accept before becoming a member of a private group', async ({ browser }) => {
    const creatorContext = await browser.newContext()
    const inviteeContext = await browser.newContext()
    const creator = await creatorContext.newPage()
    const invitee = await inviteeContext.newPage()

    const login = async (page: import('@playwright/test').Page, email: string, password: string) => {
      await page.goto('/login?next=/chat', { waitUntil: 'domcontentloaded' })
      await page.getByLabel('Correo electrónico').fill(email)
      await page.getByLabel('Contraseña').fill(password)
      await page.getByRole('button', { name: 'Ingresar al portal' }).click()
      await page.waitForURL(/\/chat(?:\?|$)/)
    }

    try {
      await login(creator, process.env.E2E_USER_EMAIL!, process.env.E2E_USER_PASSWORD!)
      await creator.goto('/chat', { waitUntil: 'domcontentloaded' })

      const pinInput = creator.getByLabel('PIN Credi o número telefónico internacional del contacto')
      for (const pin of memberPins) {
        await pinInput.fill(pin)
        await creator.getByRole('button', { name: 'Buscar contacto' }).click()
        await expect(creator.getByRole('button', { name: 'Añadir al grupo' })).toBeVisible()
        await creator.getByRole('button', { name: 'Añadir al grupo' }).click()
      }

      const groupTitle = 'E2E grupo privado ' + Date.now()
      await creator.getByLabel('Nombre del grupo').fill(groupTitle)
      await creator.getByRole('button', { name: 'Crear grupo seguro' }).click()
      await expect(creator).toHaveURL(/\/chat\?conversation=[0-9a-f-]{36}/i)
      await expect(creator.getByText(groupTitle).first()).toBeVisible()

      await login(invitee, process.env.E2E_GROUP_ACCEPT_EMAIL!, process.env.E2E_GROUP_ACCEPT_PASSWORD!)
      await invitee.goto('/chat', { waitUntil: 'domcontentloaded' })
      const invitation = invitee.locator('article').filter({ hasText: groupTitle })
      await expect(invitation).toBeVisible({ timeout: 15000 })
      await invitation.getByRole('button', { name: 'Aceptar invitación' }).click()
      await expect(invitee).toHaveURL(/\/chat\?conversation=[0-9a-f-]{36}/i)
      await expect(invitee.getByText('Grupo privado · llamadas individuales')).toBeVisible()
    } finally {
      await creatorContext.close()
      await inviteeContext.close()
    }
  })
})
