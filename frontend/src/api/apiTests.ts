export type ApiTestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ApiTestOutcome = 'passed' | 'failed' | 'blocked'

export interface ApiTestExecution {
  id: number
  api_test_id: number
  outcome: ApiTestOutcome
  notes: string | null
  recorded_at: string
}

export interface ApiTest {
  id: number
  name: string
  description: string | null
  method: ApiTestMethod
  endpoint: string
  request_body: string | null
  expected_status: number | null
  created_at: string
  updated_at: string
  executions: ApiTestExecution[]
}

export interface ApiTestInput {
  name: string
  description: string | null
  method: ApiTestMethod
  endpoint: string
  request_body: string | null
  expected_status: number | null
}

export interface ApiTestExecutionInput {
  outcome: ApiTestOutcome
  notes: string | null
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

export async function listApiTests(signal?: AbortSignal): Promise<ApiTest[]> {
  const response = await fetch(`${apiBaseUrl}/api/api-tests`, { signal })
  await throwForFailedResponse(response)
  return response.json() as Promise<ApiTest[]>
}

export async function createApiTest(input: ApiTestInput): Promise<ApiTest> {
  const response = await fetch(`${apiBaseUrl}/api/api-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<ApiTest>
}

export async function updateApiTest(
  id: number,
  input: ApiTestInput,
): Promise<ApiTest> {
  const response = await fetch(`${apiBaseUrl}/api/api-tests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<ApiTest>
}

export async function recordApiTestExecution(
  id: number,
  input: ApiTestExecutionInput,
): Promise<ApiTest> {
  const response = await fetch(`${apiBaseUrl}/api/api-tests/${id}/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<ApiTest>
}

export async function deleteApiTest(id: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/api-tests/${id}`, {
    method: 'DELETE',
  })
  await throwForFailedResponse(response)
}
