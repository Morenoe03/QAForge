import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { expect, test as setup } from '@playwright/test'

const authFile = 'test-results/.auth/user.json'

setup('sign in with the local demo account', async ({ page }) => {
  await mkdir(dirname(authFile), { recursive: true })
  await page.goto('/')
  await page.getByLabel('Username').fill('su')
  await page.getByLabel('Password').fill('su')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('link', { name: 'Test Forge' })).toBeVisible()
  await page.context().storageState({ path: authFile })
})
