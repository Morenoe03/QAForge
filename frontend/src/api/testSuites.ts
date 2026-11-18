import { apiFetch } from './request'

export interface TestSuite {
  id: number
  name: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface TestSuiteInput {
  name: string
  description: string | null
  status: string
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .replace(/\/$/, '')

async function throwForFailedResponse(response: Response): Promise<void> {
  if (response.ok) return

  const body = (await response.json()) as {
    detail?: string | Array<{ msg?: string }>
  }
  const detail = Array.isArray(body.detail)
    ? body.detail.map((issue) => issue.msg).filter(Boolean).join(' ')
    : body.detail
  throw new Error(detail || `Request failed with status ${response.status}`)
}

export async function listTestSuites(signal?: AbortSignal): Promise<TestSuite[]> {
  const response = await apiFetch(`${apiBaseUrl}/api/test-suites`, { signal })
  await throwForFailedResponse(response)
  return response.json() as Promise<TestSuite[]>
}

export async function createTestSuite(input: TestSuiteInput): Promise<TestSuite> {
  const response = await apiFetch(`${apiBaseUrl}/api/test-suites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<TestSuite>
}

export async function updateTestSuite(
  id: number,
  input: TestSuiteInput,
): Promise<TestSuite> {
  const response = await apiFetch(`${apiBaseUrl}/api/test-suites/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<TestSuite>
}

export async function deleteTestSuite(id: number): Promise<void> {
  const response = await apiFetch(`${apiBaseUrl}/api/test-suites/${id}`, {
    method: 'DELETE',
  })
  await throwForFailedResponse(response)
}
