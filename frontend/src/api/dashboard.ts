export interface DashboardStats {
  pass_rate: number;
  tests_executed: number;
  failed_tests: number;
  average_duration_seconds: number;
  recent_runs?: Array<{
    id: number
    name: string
    suite_name: string
    status: 'in_progress' | 'completed'
    created_at: string
    completed_at: string | null
  }>
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(
    import.meta.env.VITE_DASHBOARD_API_URL ??
      'http://127.0.0.1:8000/api/dashboard/stats',
  )

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard statistics')
  }

  return response.json() as Promise<DashboardStats>
}