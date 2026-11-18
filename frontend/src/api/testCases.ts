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

export interface TestCasePage {
  items: TestCase[]
  total: number
  page: number
  page_size: number
}

export interface TestCaseQuery {
  page: number
  pageSize: number
  search?: string
  suiteId?: number
  priority?: TestCasePriority
  status?: TestCaseStatus
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

export async function listTestCases(
  query: TestCaseQuery,
  signal?: AbortSignal,
): Promise<TestCasePage> {
  const params = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.pageSize),
  })
  if (query.search) params.set('search', query.search)
  if (query.suiteId !== undefined) {
    params.set('suite_id', String(query.suiteId))
  }
  if (query.priority) params.set('priority', query.priority)
  if (query.status) params.set('status', query.status)

  const response = await fetch(`${apiBaseUrl}/api/test-cases?${params}`, { signal })
  await throwForFailedResponse(response)
  return response.json() as Promise<TestCasePage>
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
