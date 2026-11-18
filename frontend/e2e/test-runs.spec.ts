import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const runNamesToCleanUp: string[] = []
const caseTitlesToCleanUp: string[] = []
const suiteNamesToCleanUp: string[] = []

async function openPage(page: Page, name: string) {
  await page.goto('/')
  await page.getByRole('link', { name, exact: true }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
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
  const runsResponse = await request.get(`${apiBaseUrl}/api/test-runs`)
  expect(runsResponse.ok()).toBeTruthy()
  const runs: Array<{ id: number; name: string }> = await runsResponse.json()
  for (const name of runNamesToCleanUp.splice(0)) {
    const run = runs.find((item) => item.name === name)
    if (run) {
      const deleteResponse = await request.delete(
        `${apiBaseUrl}/api/test-runs/${run.id}`,
      )
      expect(deleteResponse.status()).toBe(204)
    }
  }

  for (const title of caseTitlesToCleanUp.splice(0)) {
    const casesResponse = await request.get(`${apiBaseUrl}/api/test-cases`, {
      params: { search: title, page_size: '100' },
    })
    expect(casesResponse.ok()).toBeTruthy()
    const casePage: { items: Array<{ id: number; title: string }> } =
      await casesResponse.json()
    const testCase = casePage.items.find((item) => item.title === title)
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

test('starts a suite run, records failures, and reviews its history', async ({
  page,
  request,
}) => {
  const uniqueName = randomUUID()
  const suiteName = `E2E run suite ${uniqueName}`
  const caseTitle = `E2E run case ${uniqueName}`
  const runName = `E2E manual run ${uniqueName}`
  suiteNamesToCleanUp.push(suiteName)
  caseTitlesToCleanUp.push(caseTitle)
  runNamesToCleanUp.push(runName)
  const suiteId = await createSuite(request, suiteName)
  const caseResponse = await request.post(`${apiBaseUrl}/api/test-cases`, {
    data: {
      title: caseTitle,
      status: 'active',
      steps: ['Complete the checkout'],
      expected_result: 'The order is confirmed.',
      suite_ids: [suiteId],
    },
  })
  expect(caseResponse.status()).toBe(201)

  await openPage(page, 'Test Runs')
  await page.getByRole('button', { name: 'Start a test run' }).click()
  const startForm = page.getByRole('form', { name: 'Start test run' })
  await startForm.getByLabel('Run name').fill(runName)
  await startForm.getByLabel('Test suite').selectOption(String(suiteId))

  const createRunResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/test-runs') &&
      response.request().method() === 'POST',
  )
  await startForm.getByRole('button', { name: 'Start run' }).click()
  expect((await createRunResponse).status()).toBe(201)

  const resultForm = page.getByRole('form', {
    name: `Record result for ${caseTitle}`,
  })
  await resultForm.getByLabel('Outcome').selectOption('failed')
  await resultForm
    .getByLabel('Notes')
    .fill('The checkout confirmation did not appear.')

  const updateResponse = page.waitForResponse(
    (response) =>
      /\/api\/test-runs\/\d+\/results\/\d+$/.test(
        new URL(response.url()).pathname,
      ) && response.request().method() === 'PATCH',
  )
  await resultForm.getByRole('button', { name: 'Save result' }).click()
  expect((await updateResponse).status()).toBe(200)
  const runCard = page.locator('.test-run-card').filter({ hasText: runName })
  await expect(runCard).toContainText('completed')
  await expect(runCard).toContainText('1 cases · 0 passed · 1 failed · 0 pending')

  await page.getByRole('link', { name: 'Failures' }).click()
  const failureRow = page.getByRole('row').filter({ hasText: caseTitle })
  await expect(failureRow).toContainText(runName)
  await expect(failureRow).toContainText(
    'The checkout confirmation did not appear.',
  )

  await page.getByRole('link', { name: 'Test Forge' }).click()
  await expect(page.getByRole('heading', { name: 'Recent Test Runs' })).toBeVisible()
  await expect(page.getByText(runName)).toBeVisible()

  await page.getByRole('link', { name: 'Test Runs' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  const deleteResponse = page.waitForResponse(
    (response) =>
      /\/api\/test-runs\/\d+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'DELETE',
  )
  await page.getByRole('button', { name: `Delete run ${runName}` }).click()
  expect((await deleteResponse).status()).toBe(204)
  await expect(page.getByText(runName)).toHaveCount(0)
})
