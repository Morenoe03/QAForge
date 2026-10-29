import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const suiteNamesToCleanUp: string[] = []

async function openTestSuites(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Test Suites' }).click()
  await expect(page.getByRole('heading', { name: 'Test Suites' })).toBeVisible()
  await expect(page.getByText('Loading test suites…')).not.toBeVisible()
}

async function cleanUpTestSuites(request: APIRequestContext) {
  for (const name of suiteNamesToCleanUp.splice(0)) {
    const response = await request.get(`${apiBaseUrl}/api/test-suites`)
    expect(response.ok()).toBeTruthy()
    const suites: Array<{ id: number; name: string }> = await response.json()
    const suite = suites.find((item) => item.name === name)
    if (suite) {
      const deleteResponse = await request.delete(
        `${apiBaseUrl}/api/test-suites/${suite.id}`,
      )
      expect(deleteResponse.status()).toBe(204)
    }
  }
}

test.afterEach(async ({ request }) => {
  await cleanUpTestSuites(request)
})

test('creates, edits, reloads, and deletes a persisted test suite', async ({
  page,
}) => {
  const originalName = `E2E suite ${randomUUID()}`
  const updatedName = `${originalName} updated`
  suiteNamesToCleanUp.push(originalName, updatedName)

  await openTestSuites(page)
  await page.getByRole('button', { name: 'Create test suite' }).click()
  await page.getByLabel('Name').fill(originalName)
  await page.getByLabel('Description').fill('Created by a browser workflow.')

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/test-suites') &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create suite' }).click()
  const createResponse = await createResponsePromise
  expect(createResponse.status()).toBe(201)

  const originalRow = page.getByRole('row').filter({ hasText: originalName })
  await expect(originalRow).toContainText('Created by a browser workflow.')
  await expect(originalRow).toContainText('active')

  await originalRow.getByRole('button', { name: `Edit ${originalName}` }).click()
  await page.getByLabel('Name').fill(updatedName)
  await page.getByLabel('Status').selectOption('archived')

  const updateResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/test-suites\/\d+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'PATCH',
  )
  await page.getByRole('button', { name: 'Save changes' }).click()
  expect((await updateResponsePromise).status()).toBe(200)

  const updatedRow = page.getByRole('row').filter({ hasText: updatedName })
  await expect(updatedRow).toContainText('archived')

  await page.reload()
  await page.getByRole('link', { name: 'Test Suites' }).click()
  const persistedRow = page.getByRole('row').filter({ hasText: updatedName })
  await expect(persistedRow).toContainText('Created by a browser workflow.')
  await expect(persistedRow).toContainText('archived')

  page.once('dialog', (dialog) => dialog.accept())
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/test-suites/') &&
      response.request().method() === 'DELETE',
  )
  await persistedRow.getByRole('button', { name: `Delete ${updatedName}` }).click()
  expect((await deleteResponsePromise).status()).toBe(204)
  await expect(page.getByRole('row').filter({ hasText: updatedName })).toHaveCount(0)
})

test('validates required and whitespace-only suite names', async ({
  page,
}) => {
  await openTestSuites(page)
  await page.getByRole('button', { name: 'Create test suite' }).click()

  const nameInput = page.getByLabel('Name')
  await page.getByRole('button', { name: 'Create suite' }).click()
  await expect
    .poll(() => nameInput.evaluate((element) => element.matches(':invalid')))
    .toBe(true)

  await nameInput.fill('   ')
  await page.getByRole('button', { name: 'Create suite' }).click()
  await expect(page.getByRole('alert')).toHaveText('Name cannot be blank.')
})

test('shows a useful error when the API rejects a duplicate suite name', async ({
  page,
}) => {
  const duplicateName = `E2E duplicate ${randomUUID()}`
  suiteNamesToCleanUp.push(duplicateName)

  await openTestSuites(page)
  await page.getByRole('button', { name: 'Create test suite' }).click()
  await page.getByLabel('Name').fill(duplicateName)
  await page.getByRole('button', { name: 'Create suite' }).click()
  await expect(
    page.getByRole('row').filter({ hasText: duplicateName }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Create test suite' }).click()
  await page.getByLabel('Name').fill(duplicateName)

  const duplicateResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/test-suites') &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create suite' }).click()
  expect((await duplicateResponsePromise).status()).toBe(409)
  await expect(page.getByRole('alert')).toContainText(
    'A test suite with this name already exists.',
  )
})
