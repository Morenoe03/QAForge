import { expect, test } from '@playwright/test'

const recentRun = {
  id: 123,
  name: 'QAForge CI',
  run_number: 7,
  status: 'completed',
  conclusion: 'success',
  branch: 'development',
  html_url: 'https://github.com/Morenoe03/QAForge/actions/runs/123',
  created_at: '2026-11-18T12:00:00Z',
  updated_at: '2026-11-18T12:05:00Z',
}

test('shows GitHub workflow runs and triggers the configured workflow', async ({
  page,
}) => {
  let dispatchCount = 0
  await page.route('**/api/pipelines', (route) =>
    route.fulfill({
      json: {
        configured: true,
        repository: 'Morenoe03/QAForge',
        workflow: 'backend-tests.yml',
        ref: 'development',
        can_dispatch: true,
        message: null,
        runs: [recentRun],
      },
    }),
  )
  await page.route('**/api/pipelines/dispatch', async (route) => {
    expect(route.request().method()).toBe('POST')
    dispatchCount += 1
    await route.fulfill({
      status: 202,
      json: {
        message: 'GitHub Actions workflow dispatch requested.',
        ref: 'development',
      },
    })
  })

  await page.goto('/')
  await page.getByRole('link', { name: 'Pipelines' }).click()
  await expect(page.getByRole('heading', { name: 'Pipelines', exact: true })).toBeVisible()
  await expect(page.getByText('Morenoe03/QAForge')).toBeVisible()
  const runRow = page.getByRole('row').filter({ hasText: 'QAForge CI #7' })
  await expect(runRow).toContainText('success')
  await expect(runRow.getByRole('link', { name: 'Open run' })).toHaveAttribute(
    'href',
    recentRun.html_url,
  )

  await page.getByRole('button', { name: 'Run workflow' }).click()
  await expect(page.getByRole('status')).toContainText(
    'GitHub Actions workflow dispatch requested.',
  )
  await expect(page.getByRole('status')).toContainText('Branch: development.')
  expect(dispatchCount).toBe(1)
})

test('shows setup instructions when no repository is configured', async ({
  page,
}) => {
  await page.route('**/api/pipelines', (route) =>
    route.fulfill({
      json: {
        configured: false,
        repository: null,
        workflow: 'backend-tests.yml',
        ref: 'development',
        can_dispatch: false,
        message: 'Set GITHUB_ACTIONS_REPOSITORY to enable this workflow.',
        runs: [],
      },
    }),
  )

  await page.goto('/')
  await page.getByRole('link', { name: 'Pipelines' }).click()
  await expect(
    page.getByRole('heading', { name: 'Configure GitHub Actions' }),
  ).toBeVisible()
  await expect(
    page.getByText('GITHUB_ACTIONS_ALLOW_DISPATCH=true'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run workflow' })).toHaveCount(0)
})
