export type TestCasePriority = 'low' | 'medium' | 'high' | 'critical'
export type TestCaseType = 'manual' | 'automated'
export type TestCaseStatus = 'draft' | 'active' | 'deprecated'

export interface TestCase {
  id: number
  title: string
  description: string | null
  preconditions: string | null
  steps: string[]
  expected_result: string | null
  priority: TestCasePriority
  test_type: TestCaseType
  status: TestCaseStatus
  tags: string[]
  suite_ids: number[]
  created_at: string
  updated_at: string
}

export interface TestCaseInput {
  title: string
  description: string | null
  preconditions: string | null
  steps: string[]
  expected_result: string | null
  priority: TestCasePriority
  test_type: TestCaseType
  status: TestCaseStatus
  tags: string[]
  suite_ids: number[]
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

export async function listTestCases(signal?: AbortSignal): Promise<TestCase[]> {
  const response = await fetch(`${apiBaseUrl}/api/test-cases`, { signal })
  await throwForFailedResponse(response)
  return response.json() as Promise<TestCase[]>
}

export async function createTestCase(input: TestCaseInput): Promise<TestCase> {
  const response = await fetch(`${apiBaseUrl}/api/test-cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<TestCase>
}

export async function updateTestCase(
  id: number,
  input: TestCaseInput,
): Promise<TestCase> {
  const response = await fetch(`${apiBaseUrl}/api/test-cases/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<TestCase>
}

export async function deleteTestCase(id: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/test-cases/${id}`, {
    method: 'DELETE',
  })
  await throwForFailedResponse(response)
}
