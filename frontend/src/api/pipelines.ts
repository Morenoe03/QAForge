export interface PipelineRun {
  id: number
  name: string
  run_number: number
  status: string
  conclusion: string | null
  branch: string
  html_url: string
  created_at: string
  updated_at: string
}

export interface PipelineOverview {
  configured: boolean
  repository: string | null
  workflow: string | null
  ref: string | null
  can_dispatch: boolean
  message: string | null
  runs: PipelineRun[]
}

export interface PipelineDispatch {
  message: string
  ref: string
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

export async function getPipelineOverview(
  signal?: AbortSignal,
): Promise<PipelineOverview> {
  const response = await fetch(`${apiBaseUrl}/api/pipelines`, { signal })
  await throwForFailedResponse(response)
  return response.json() as Promise<PipelineOverview>
}

export async function dispatchPipeline(): Promise<PipelineDispatch> {
  const response = await fetch(`${apiBaseUrl}/api/pipelines/dispatch`, {
    method: 'POST',
  })
  await throwForFailedResponse(response)
  return response.json() as Promise<PipelineDispatch>
}
