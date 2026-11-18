export type TestRunOutcome = 'passed' | 'failed' | 'blocked' | 'skipped'
export type TestRunState = 'in_progress' | 'completed'

export interface TestCaseSnapshot {
  version: number
  steps: string[]
  expected_result: string | null
  preconditions: string | null
  priority: string
  test_type: string
}

export interface TestRunResult {
  id: number
  test_case_id: number | null
  case_title: string
  case_snapshot: TestCaseSnapshot
  outcome: 'pending' | TestRunOutcome
  notes: string | null
  recorded_at: string | null
}

export interface TestRun {
  id: number
  name: string
  suite_id: number | null
  suite_name: string
  status: TestRunState
  duration_seconds: number | null
  created_at: string
  completed_at: string | null
  results: TestRunResult[]
}

export interface TestRunInput {
  name: string
  suite_id: number
}

export interface TestRunResultInput {
  outcome: TestRunOutcome
  notes: string | null
}

export interface Failure {
  id: number
  run_id: number
  run_name: string
  suite_name: string
  test_case_id: number | null
  case_title: string
  case_snapshot: TestCaseSnapshot
  notes: string | null
  recorded_at: string
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

export async function listTestRuns(signal?: AbortSignal): Promise<TestRun[]> {
  const response = await fetch(`${apiBaseUrl}/api/test-runs`, { signal })
  await throwForFailedResponse(response)
  return response.json() as Promise<TestRun[]>
}

export async function createTestRun(input: TestRunInput): Promise<TestRun> {
  const response = await fetch(`${apiBaseUrl}/api/test-runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<TestRun>
}

export async function recordTestRunResult(
  runId: number,
  resultId: number,
  input: TestRunResultInput,
): Promise<TestRun> {
  const response = await fetch(
    `${apiBaseUrl}/api/test-runs/${runId}/results/${resultId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  await throwForFailedResponse(response)
  return response.json() as Promise<TestRun>
}

export async function deleteTestRun(id: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/test-runs/${id}`, {
    method: 'DELETE',
  })
  await throwForFailedResponse(response)
}

export async function listFailures(signal?: AbortSignal): Promise<Failure[]> {
  const response = await fetch(`${apiBaseUrl}/api/failures`, { signal })
  await throwForFailedResponse(response)
  return response.json() as Promise<Failure[]>
}
