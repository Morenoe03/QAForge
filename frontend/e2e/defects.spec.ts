import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const defectTitlesToCleanUp: string[] = []
const runNamesToCleanUp: string[] = []
const caseTitlesToCleanUp: string[] = []
const suiteNamesToCleanUp: string[] = []

async function openDefects(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Defects' }).click()
  await expect(page.getByRole('heading', { name: 'Defects', exact: true })).toBeVisible()
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
  const defectsResponse = await request.get(`${apiBaseUrl}/api/defects`)
  expect(defectsResponse.ok()).toBeTruthy()
  const defects: Array<{ id: number; title: string }> =
    await defectsResponse.json()
  for (const title of defectTitlesToCleanUp.splice(0)) {
    const defect = defects.find((item) => item.title === title)
    if (defect) {
      const deleteResponse = await request.delete(
        `${apiBaseUrl}/api/defects/${defect.id}`,
      )
      expect(deleteResponse.status()).toBe(204)
    }
  }

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

test('creates, links, edits, and deletes a defect', async ({ page, request }) => {
  const uniqueName = randomUUID()
  const suiteName = `E2E defect suite ${uniqueName}`
  const caseTitle = `E2E defect case ${uniqueName}`
  const runName = `E2E defect run ${uniqueName}`
  const defectTitle = `E2E defect ${uniqueName}`
  suiteNamesToCleanUp.push(suiteName)
  caseTitlesToCleanUp.push(caseTitle)
  runNamesToCleanUp.push(runName)
  defectTitlesToCleanUp.push(defectTitle)

  const suiteId = await createSuite(request, suiteName)
  const caseResponse = await request.post(`${apiBaseUrl}/api/test-cases`, {
    data: {
      title: caseTitle,
      status: 'active',
      suite_ids: [suiteId],
    },
  })
  expect(caseResponse.status()).toBe(201)
  const runResponse = await request.post(`${apiBaseUrl}/api/test-runs`, {
    data: { name: runName, suite_id: suiteId },
  })
  expect(runResponse.status()).toBe(201)
  const run: {
    id: number
    results: Array<{ id: number }>
  } = await runResponse.json()
  const resultId = run.results[0].id
  const failedResponse = await request.patch(
    `${apiBaseUrl}/api/test-runs/${run.id}/results/${resultId}`,
    { data: { outcome: 'failed', notes: 'The application returned an error.' } },
  )
  expect(failedResponse.status()).toBe(200)

  await openDefects(page)
  await page.getByRole('button', { name: 'Report a defect' }).click()
  const form = page.getByRole('form', { name: 'Defect form' })
  await form.getByLabel('Title').fill(defectTitle)
  await form.getByLabel('Description').fill('Payment flow returns an error.')
  await form.getByLabel('Severity').selectOption('high')
  await form
    .getByLabel('Link to failed test result')
    .selectOption(String(resultId))

  const createResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/defects') &&
      response.request().method() === 'POST',
  )
  await form.getByRole('button', { name: 'Create defect' }).click()
  expect((await createResponse).status()).toBe(201)
  const defectRow = page.getByRole('row').filter({ hasText: defectTitle })
  await expect(defectRow).toContainText('high')
  await expect(defectRow).toContainText(caseTitle)
  await expect(defectRow).toContainText(runName)

  await defectRow.getByRole('button', { name: `Edit ${defectTitle}` }).click()
  await form.getByLabel('Severity').selectOption('critical')
  await form.getByLabel('Status').selectOption('in_progress')
  const updateResponse = page.waitForResponse(
    (response) =>
      /\/api\/defects\/\d+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'PATCH',
  )
  await form.getByRole('button', { name: 'Save changes' }).click()
  expect((await updateResponse).status()).toBe(200)
  await expect(defectRow).toContainText('critical')
  await expect(defectRow).toContainText('in progress')

  page.once('dialog', (dialog) => dialog.accept())
  const deleteResponse = page.waitForResponse(
    (response) =>
      /\/api\/defects\/\d+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'DELETE',
  )
  await defectRow.getByRole('button', { name: `Delete ${defectTitle}` }).click()
  expect((await deleteResponse).status()).toBe(204)
  await expect(defectRow).toHaveCount(0)
})
