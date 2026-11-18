import { useEffect, useState } from 'react'
import { listFailures, type Failure } from '../../api/testRuns'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not load failures.'
}

export default function FailuresPage() {
  const [failures, setFailures] = useState<Failure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void listFailures(controller.signal)
      .then(setFailures)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(loadError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="workspace-page">
      <div className="workspace-page-header">
        <div>
          <span className="workspace-eyebrow">QAForge workspace</span>
          <h1>Failures</h1>
          <p>Review failed outcomes recorded in completed and in-progress runs.</p>
        </div>
      </div>

      {error && (
        <p className="suite-alert" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <section className="workspace-empty-state" aria-live="polite">
          <p>Loading failures…</p>
        </section>
      ) : failures.length === 0 ? (
        <section className="workspace-empty-state" aria-label="Failures">
          <div className="workspace-empty-icon" aria-hidden="true">
            ✓
          </div>
          <h2>No failures recorded</h2>
          <p>Failed test results will appear here when a run outcome is recorded.</p>
        </section>
      ) : (
        <section className="suite-table-card" aria-label="Failed test results">
          <div className="suite-table-scroll">
            <table className="suite-table">
              <thead>
                <tr>
                  <th scope="col">Test case</th>
                  <th scope="col">Run</th>
                  <th scope="col">Suite</th>
                  <th scope="col">Failure notes</th>
                  <th scope="col">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((failure) => (
                  <tr key={failure.id}>
                    <th scope="row">{failure.case_title}</th>
                    <td>{failure.run_name}</td>
                    <td>{failure.suite_name}</td>
                    <td>{failure.notes || 'No notes provided'}</td>
                    <td>{new Date(failure.recorded_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
