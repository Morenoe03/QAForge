import { expect, test } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

test.describe.configure({ mode: 'serial' })

test.afterEach(async ({ request }) => {
  const response = await request.patch(`${apiBaseUrl}/api/auth/me`, {
    data: {
      display_name: 'Emanuel Moreno',
      email: 'emanuellmorreno@gmail.com',
    },
  })
  expect(response.ok()).toBeTruthy()
})

test('protects the API and accepts the demo account', async ({ playwright }) => {
  const anonymous = await playwright.request.newContext({
    baseURL: apiBaseUrl,
    storageState: { cookies: [], origins: [] },
  })
  try {
    expect((await anonymous.get('/api/test-suites')).status()).toBe(401)
    expect(
      (
        await anonymous.post('/api/auth/login', {
          data: { username: 'su', password: 'wrong' },
        })
      ).status(),
    ).toBe(401)
    expect(
      (
        await anonymous.post('/api/auth/login', {
          data: { username: 'su', password: 'su' },
        })
      ).status(),
    ).toBe(200)
    expect((await anonymous.get('/api/test-suites')).status()).toBe(200)
    expect((await anonymous.post('/api/auth/logout')).status()).toBe(200)
    expect((await anonymous.get('/api/test-suites')).status()).toBe(401)
  } finally {
    await anonymous.dispose()
  }
})

test('saves account settings and signs out and back in', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Account menu for/ }).click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  await page.getByLabel('Display name').fill('QAForge Demo')
  await page.getByLabel('Email').fill('demo@example.com')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByRole('status')).toHaveText('Profile settings saved.')

  await page.getByRole('switch', { name: 'Dark mode' }).click()
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  await page.reload()
  await page.getByRole('button', { name: /Account menu for QAForge Demo/ }).click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByLabel('Display name')).toHaveValue('QAForge Demo')
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('button', { name: /Account menu for QAForge Demo/ }).click()
  await page.getByRole('link', { name: 'Logout' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await page.getByLabel('Username').fill('su')
  await page.getByLabel('Password').fill('su')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: /Account menu for QAForge Demo/ })).toBeVisible()
})
