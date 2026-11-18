export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical'
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Defect {
  id: number
  title: string
  description: string | null
  severity: DefectSeverity
  status: DefectStatus
  test_run_result_id: number | null
  case_title: string | null
  run_name: string | null
  created_at: string
  updated_at: string
}

export interface DefectInput {
  title: string
  description: string | null
  severity: DefectSeverity
  status: DefectStatus
  test_run_result_id: number | null
}

export type DefectUpdate = Omit<DefectInput, 'test_run_result_id'>

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

export async function listDefects(signal?: AbortSignal): Promise<Defect[]> {
  const response = await fetch(`${apiBaseUrl}/api/defects`, { signal })
  await throwForFailedResponse(response)
  return response.json() as Promise<Defect[]>
}

export async function createDefect(input: DefectInput): Promise<Defect> {
  const response = await fetch(`${apiBaseUrl}/api/defects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<Defect>
}

export async function updateDefect(
  id: number,
  input: DefectUpdate,
): Promise<Defect> {
  const response = await fetch(`${apiBaseUrl}/api/defects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<Defect>
}

export async function deleteDefect(id: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/defects/${id}`, {
    method: 'DELETE',
  })
  await throwForFailedResponse(response)
}
