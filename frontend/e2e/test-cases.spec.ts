import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const caseTitlesToCleanUp: string[] = []
const suiteNamesToCleanUp: string[] = []

async function openTestCases(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Test Cases' }).click()
  await expect(
    page.getByRole('heading', { name: 'Test Cases', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Loading test cases…')).not.toBeVisible()
}

async function createSuite(
  request: APIRequestContext,
  name: string,
): Promise<number> {
  const response = await request.post(`${apiBaseUrl}/api/test-suites`, {
    data: { name },
  })
  expect(response.status()).toBe(201)
  const suite: { id: number } = await response.json()
  return suite.id
}

async function cleanUpTestData(request: APIRequestContext) {
  const casesResponse = await request.get(`${apiBaseUrl}/api/test-cases`)
  expect(casesResponse.ok()).toBeTruthy()
  const cases: Array<{ id: number; title: string }> = await casesResponse.json()
  for (const title of caseTitlesToCleanUp.splice(0)) {
    const testCase = cases.find((item) => item.title === title)
    if (testCase) {
      const deleteResponse = await request.delete(
        `${apiBaseUrl}/api/test-cases/${testCase.id}`,
      )
      expect(deleteResponse.status()).toBe(204)
    }
  }

  const suitesResponse = await request.get(`${apiBaseUrl}/api/test-suites`)
  expect(suitesResponse.ok()).toBeTruthy()
  const suites: Array<{ id: number; name: string }> = await suitesResponse.json()
  for (const name of suiteNamesToCleanUp.splice(0)) {
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
  await cleanUpTestData(request)
})

test('creates, edits, reloads, and deletes a test case linked to multiple suites', async ({
  page,
  request,
}) => {
  const uniqueName = randomUUID()
  const firstSuiteName = `E2E case suite one ${uniqueName}`
  const secondSuiteName = `E2E case suite two ${uniqueName}`
  const originalTitle = `E2E test case ${uniqueName}`
  const updatedTitle = `${originalTitle} updated`
  suiteNamesToCleanUp.push(firstSuiteName, secondSuiteName)
  caseTitlesToCleanUp.push(originalTitle, updatedTitle)

  const firstSuiteId = await createSuite(request, firstSuiteName)
  const secondSuiteId = await createSuite(request, secondSuiteName)

  await openTestCases(page)
  await page.getByRole('button', { name: 'Create test case' }).click()
  await page.getByLabel('Title').fill(originalTitle)
  await page.getByLabel('Description').fill('Documents the checkout workflow.')
  await page.getByLabel('Preconditions').fill('A product is available.')
  await page.getByLabel('Test steps (one per line)').fill(
    'Add the product to the cart\nComplete payment',
  )
  await page.getByLabel('Expected result').fill('The order is confirmed.')
  await page.getByLabel('Priority').selectOption('high')
  await page.getByLabel('Test type').selectOption('automated')
  await page.getByLabel('Status').selectOption('active')
  await page.getByLabel('Tags (comma-separated)').fill('checkout, critical-path')
  await page
    .getByLabel('Test suites')
    .selectOption([String(firstSuiteId), String(secondSuiteId)])

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/test-cases') &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create case' }).click()
  expect((await createResponsePromise).status()).toBe(201)

  const createdRow = page.getByRole('row').filter({ hasText: originalTitle })
  await expect(createdRow).toContainText(firstSuiteName)
  await expect(createdRow).toContainText(secondSuiteName)
  await expect(createdRow).toContainText('critical-path')
  await expect(createdRow).toContainText('high')
  await expect(createdRow).toContainText('automated')
  await createdRow.getByText('View details').click()
  await expect(createdRow).toContainText('Complete payment')
  await expect(createdRow).toContainText('The order is confirmed.')

  await createdRow.getByRole('button', { name: `Edit ${originalTitle}` }).click()
  await page.getByLabel('Title').fill(updatedTitle)
  await page.getByLabel('Priority').selectOption('medium')
  await page.getByLabel('Test suites').selectOption(String(secondSuiteId))

  const updateResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/test-cases\/\d+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'PATCH',
  )
  await page.getByRole('button', { name: 'Save changes' }).click()
  expect((await updateResponsePromise).status()).toBe(200)

  const updatedRow = page.getByRole('row').filter({ hasText: updatedTitle })
  await expect(updatedRow).toContainText(secondSuiteName)
  await expect(updatedRow).not.toContainText(firstSuiteName)
  await expect(updatedRow).toContainText('medium')

  await page.reload()
  await page.getByRole('link', { name: 'Test Cases' }).click()
  const persistedRow = page.getByRole('row').filter({ hasText: updatedTitle })
  await expect(persistedRow).toContainText('Documents the checkout workflow.')
  await expect(persistedRow).toContainText(secondSuiteName)

  page.once('dialog', (dialog) => dialog.accept())
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/test-cases\/\d+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'DELETE',
  )
  await persistedRow.getByRole('button', { name: `Delete ${updatedTitle}` }).click()
  expect((await deleteResponsePromise).status()).toBe(204)
  await expect(page.getByRole('row').filter({ hasText: updatedTitle })).toHaveCount(0)
})

test('validates required and whitespace-only test case titles', async ({ page }) => {
  await openTestCases(page)
  await page.getByRole('button', { name: 'Create test case' }).click()

  const titleInput = page.getByLabel('Title')
  await page.getByRole('button', { name: 'Create case' }).click()
  await expect
    .poll(() => titleInput.evaluate((element) => element.matches(':invalid')))
    .toBe(true)

  await titleInput.fill('   ')
  await page.getByRole('button', { name: 'Create case' }).click()
  await expect(page.getByRole('alert')).toHaveText('Title cannot be blank.')
})
