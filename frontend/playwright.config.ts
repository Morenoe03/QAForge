import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from '@playwright/test'

const backendDirectory = resolve(process.cwd(), '..', 'backend')
const localPythonExecutable = resolve(
  backendDirectory,
  '.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
)
const pythonExecutable =
  existsSync(localPythonExecutable)
    ? localPythonExecutable
    : (process.env.PYTHON ??
      (process.platform === 'win32' ? 'python' : 'python3'))
const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const webBaseUrl = 'http://127.0.0.1:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  outputDir: 'test-results',
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['setup'],
      use: {
        storageState: 'test-results/.auth/user.json',
      },
    },
  ],
  use: {
    baseURL: webBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `"${pythonExecutable}" -m uvicorn app.main:app --host 127.0.0.1 --port 8000`,
      cwd: backendDirectory,
      url: `${apiBaseUrl}/health/database`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      url: webBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_BASE_URL: apiBaseUrl,
      },
    },
  ],
})
