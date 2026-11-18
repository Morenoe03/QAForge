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
  const caseForm = page.getByRole('form', { name: 'Test case form' })
  await caseForm.getByLabel('Title').fill(originalTitle)
  await caseForm.getByLabel('Description').fill('Documents the checkout workflow.')
  await caseForm.getByLabel('Preconditions').fill('A product is available.')
  await caseForm.getByLabel('Test steps (one per line)').fill(
    'Add the product to the cart\nComplete payment',
  )
  await caseForm.getByLabel('Expected result').fill('The order is confirmed.')
  await caseForm.getByLabel('Priority').selectOption('high')
  await caseForm.getByLabel('Test type').selectOption('automated')
  await caseForm.getByLabel('Status').selectOption('active')
  await caseForm
    .getByLabel('Tags (comma-separated)')
    .fill('checkout, critical-path')
  await caseForm
    .getByLabel('Test suites')
    .selectOption([String(firstSuiteId), String(secondSuiteId)])

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/test-cases') &&
      response.request().method() === 'POST',
  )
  await caseForm.getByRole('button', { name: 'Create case' }).click()
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
  await caseForm.getByLabel('Title').fill(updatedTitle)
  await caseForm.getByLabel('Priority').selectOption('medium')
  await caseForm.getByLabel('Test suites').selectOption(String(secondSuiteId))

  const updateResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/test-cases\/\d+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'PATCH',
  )
  await caseForm.getByRole('button', { name: 'Save changes' }).click()
  expect((await updateResponsePromise).status()).toBe(200)

  const updatedRow = page.getByRole('row').filter({ hasText: updatedTitle })
  await expect(updatedRow).toContainText(secondSuiteName)
  await expect(updatedRow).not.toContainText(firstSuiteName)
  await expect(updatedRow).toContainText('medium')

  await updatedRow.getByRole('button', { name: `History for ${updatedTitle}` }).click()
  const historyPanelBeforeReload = page.getByRole('region', {
    name: `Case history for ${updatedTitle}`,
  })
  await expect(historyPanelBeforeReload).toContainText('Version 2 · updated')
  await expect(historyPanelBeforeReload).toContainText('Version 1 · created')
  await expect(historyPanelBeforeReload).toContainText(originalTitle)
  await historyPanelBeforeReload
    .getByRole('button', { name: 'Close history' })
    .click()
  await expect(historyPanelBeforeReload).toHaveCount(0)

  await page.reload()
  await page.getByRole('link', { name: 'Test Cases' }).click()
  const persistedRow = page.getByRole('row').filter({ hasText: updatedTitle })
  await expect(persistedRow).toContainText('Documents the checkout workflow.')
  await expect(persistedRow).toContainText(secondSuiteName)
  await expect(persistedRow.getByRole('cell', { name: '2', exact: true })).toBeVisible()

  await persistedRow
    .getByRole('button', { name: `History for ${updatedTitle}` })
    .click()
  const historyPanelAfterReload = page.getByRole('region', {
    name: `Case history for ${updatedTitle}`,
  })
  await expect(historyPanelAfterReload).toContainText('Version 2 · updated')
  await expect(historyPanelAfterReload).toContainText('Version 1 · created')
  await expect(historyPanelAfterReload).toContainText(originalTitle)
  await historyPanelAfterReload
    .getByRole('button', { name: 'Close history' })
    .click()
  await expect(historyPanelAfterReload).toHaveCount(0)

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
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('form', { name: 'Test case form' })).toHaveCount(0)
})

test('searches, filters, and paginates test cases', async ({ page, request }) => {
  const uniqueName = randomUUID()
  const suiteName = `E2E filter suite ${uniqueName}`
  suiteNamesToCleanUp.push(suiteName)
  const suiteId = await createSuite(request, suiteName)

  const titles = Array.from(
    { length: 11 },
    (_, index) => `E2E filter ${uniqueName} case ${index + 1}`,
  )
  caseTitlesToCleanUp.push(...titles)
  const createResponses = await Promise.all(
    titles.map((title, index) =>
      request.post(`${apiBaseUrl}/api/test-cases`, {
        data: {
          title,
          priority: index % 2 === 0 ? 'high' : 'low',
          status: index % 2 === 0 ? 'active' : 'draft',
          suite_ids: [suiteId],
        },
      }),
    ),
  )
  expect(createResponses.every((response) => response.status() === 201)).toBe(true)

  await openTestCases(page)
  await page.setViewportSize({ width: 900, height: 600 })
  await page.getByLabel('Search test cases').fill(uniqueName)
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Showing 1–10 of 11 test cases',
  )
  await expect(page.getByText('Page 1 of 2')).toBeVisible()

  const tableScroll = page.locator('.test-case-table-scroll')
  const horizontalMetrics = await tableScroll.evaluate((element) => ({
    clientWidth: element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
    scrollWidth: element.scrollWidth,
  }))
  expect(horizontalMetrics.overflowX).toBe('auto')
  expect(horizontalMetrics.scrollWidth).toBeGreaterThan(
    horizontalMetrics.clientWidth,
  )
  await tableScroll.evaluate((element) => {
    element.scrollLeft = element.scrollWidth
  })
  expect(
    await tableScroll.evaluate((element) => element.scrollLeft),
  ).toBeGreaterThan(0)

  const workspace = page.locator('.workspace-page')
  await expect
    .poll(() =>
      workspace.evaluate((element) => element.scrollHeight > element.clientHeight),
    )
    .toBe(true)
  await workspace.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  expect(
    await workspace.evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Showing 11–11 of 11 test cases',
  )
  await expect(page.getByRole('row')).toHaveCount(2)
  await expect(page.getByText('Page 2 of 2')).toBeVisible()
  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Showing 1–10 of 11 test cases',
  )
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Page 2 of 2')).toBeVisible()

  await page.getByLabel('Filter by suite').selectOption(String(suiteId))
  await page.getByLabel('Filter by priority').selectOption('high')
  await page.getByLabel('Filter by status').selectOption('active')
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Showing 1–6 of 6 test cases',
  )
  await expect(page.getByRole('row')).toHaveCount(7)

  await page.getByLabel('Search test cases').fill(`${uniqueName}-missing`)
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(
    page.getByRole('heading', { name: 'No matching test cases' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByLabel('Search test cases')).toHaveValue('')
  await expect(page.getByLabel('Filter by suite')).toHaveValue('')
})
