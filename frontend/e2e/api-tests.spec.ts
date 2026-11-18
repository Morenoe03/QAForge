import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const namesToCleanUp: string[] = []

async function openApiTests(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'API Tests' }).click()
  await expect(page.getByRole('heading', { name: 'API Tests', exact: true })).toBeVisible()
}

async function cleanUpApiTests(request: APIRequestContext) {
  const response = await request.get(`${apiBaseUrl}/api/api-tests`)
  expect(response.ok()).toBeTruthy()
  const apiTests: Array<{ id: number; name: string }> = await response.json()
  for (const name of namesToCleanUp.splice(0)) {
    const apiTest = apiTests.find((item) => item.name === name)
    if (apiTest) {
      const deleteResponse = await request.delete(
        `${apiBaseUrl}/api/api-tests/${apiTest.id}`,
      )
      expect(deleteResponse.status()).toBe(204)
    }
  }
}

test.afterEach(async ({ request }) => {
  await cleanUpApiTests(request)
})

test('creates, records outcomes, edits, and deletes an API test', async ({
  page,
  request,
}) => {
  const apiTestName = `E2E API test ${randomUUID()}`
  namesToCleanUp.push(apiTestName)
  let outboundRequests = 0
  page.on('request', (requestEvent) => {
    if (requestEvent.url().includes('/documented-service/orders')) {
      outboundRequests += 1
    }
  })

  await openApiTests(page)
  await expect(
    page.getByText('API definitions are documentation only.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Create API test' }).click()
  const form = page.getByRole('form', { name: 'API test form' })
  await form.getByLabel('Name').fill(apiTestName)
  await form.getByLabel('Description').fill('Validate order creation.')
  await form.getByLabel('HTTP method').selectOption('POST')
  await form.getByLabel('Endpoint').fill('https://documented-service/orders')
  await form.getByLabel('Request body').fill('{"item":"book"}')
  await form.getByLabel('Expected HTTP status').fill('201')

  const createResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/api-tests') &&
      response.request().method() === 'POST',
  )
  await form.getByRole('button', { name: 'Create API test' }).click()
  expect((await createResponse).status()).toBe(201)

  const apiTestCard = page.getByRole('region', {
    name: `API test ${apiTestName}`,
  })
  await expect(apiTestCard).toContainText('POST')
  await expect(apiTestCard).toContainText('https://documented-service/orders')
  await expect(apiTestCard).toContainText('201')
  await apiTestCard
    .getByRole('button', { name: `Record outcome for ${apiTestName}` })
    .click()
  const resultForm = apiTestCard.getByRole('form', {
    name: `Record API test result for ${apiTestName}`,
  })
  await resultForm.getByLabel('Outcome').selectOption('passed')
  await resultForm.getByLabel('Notes').fill('Manually confirmed HTTP 201.')
  const resultResponse = page.waitForResponse(
    (response) =>
      /\/api\/api-tests\/\d+\/executions$/.test(
        new URL(response.url()).pathname,
      ) && response.request().method() === 'POST',
  )
  await resultForm.getByRole('button', { name: 'Save outcome' }).click()
  expect((await resultResponse).status()).toBe(200)
  await expect(apiTestCard).toContainText('Manually confirmed HTTP 201.')
  expect(outboundRequests).toBe(0)

  await apiTestCard.getByRole('button', { name: `Edit ${apiTestName}` }).click()
  await form.getByLabel('Endpoint').fill('/api/v1/orders')
  const updateResponse = page.waitForResponse(
    (response) =>
      /\/api\/api-tests\/\d+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'PATCH',
  )
  await form.getByRole('button', { name: 'Save changes' }).click()
  expect((await updateResponse).status()).toBe(200)
  await expect(apiTestCard).toContainText('/api/v1/orders')
  await expect(apiTestCard).toContainText('passed')

  page.once('dialog', (dialog) => dialog.accept())
  const deleteResponse = page.waitForResponse(
    (response) =>
      /\/api\/api-tests\/\d+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'DELETE',
  )
  await apiTestCard.getByRole('button', { name: `Delete ${apiTestName}` }).click()
  expect((await deleteResponse).status()).toBe(204)
  await expect(apiTestCard).toHaveCount(0)
  const cleanupResponse = await request.get(`${apiBaseUrl}/api/api-tests`)
  expect(cleanupResponse.ok()).toBeTruthy()
})
