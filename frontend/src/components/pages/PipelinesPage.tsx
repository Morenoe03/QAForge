import { useEffect, useState } from 'react'
import {
  dispatchPipeline,
  getPipelineOverview,
  type PipelineOverview,
} from '../../api/pipelines'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not load pipeline data.'
}

export default function PipelinesPage() {
  const [overview, setOverview] = useState<PipelineOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [dispatching, setDispatching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void getPipelineOverview(controller.signal)
      .then((result) => {
        setOverview(result)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(loadError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [refreshKey])

  function refresh() {
    setNotice(null)
    setLoading(true)
    setRefreshKey((current) => current + 1)
  }

  async function handleDispatch() {
    setDispatching(true)
    setError(null)
    setNotice(null)
    try {
      const result = await dispatchPipeline()
      setNotice(`${result.message} Branch: ${result.ref}.`)
      setLoading(true)
      setRefreshKey((current) => current + 1)
    } catch (dispatchError) {
      setError(errorMessage(dispatchError))
    } finally {
      setDispatching(false)
    }
  }

  return (
    <main className="workspace-page">
      <div className="workspace-page-header">
        <div>
          <span className="workspace-eyebrow">QAForge workspace</span>
          <h1>Pipelines</h1>
          <p>Review and trigger the configured GitHub Actions workflow.</p>
        </div>
        <button
          type="button"
          className="suite-secondary-action"
          onClick={refresh}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="suite-alert" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="pipeline-notice" role="status">{notice}</p>}

      {loading && !overview ? (
        <section className="workspace-empty-state" aria-live="polite">
          <p>Loading GitHub Actions…</p>
        </section>
      ) : overview && !overview.configured ? (
        <section className="suite-table-card pipeline-setup">
          <h2>Configure GitHub Actions</h2>
          <p>{overview.message}</p>
          <pre>{`GITHUB_ACTIONS_REPOSITORY=owner/repository
GITHUB_ACTIONS_WORKFLOW=${overview.workflow}
GITHUB_ACTIONS_REF=${overview.ref}
GITHUB_ACTIONS_TOKEN=your-fine-grained-token
GITHUB_ACTIONS_ALLOW_DISPATCH=true`}</pre>
          <p>
            Add these values to the local <code>.env</code> file. The token must
            stay on the backend; dispatch is disabled until explicitly enabled.
          </p>
        </section>
      ) : overview ? (
        <>
          <section className="suite-table-card pipeline-config">
            <div>
              <span className="workspace-eyebrow">Configured workflow</span>
              <h2>{overview.workflow}</h2>
              <p>
                Repository: <strong>{overview.repository}</strong> · Ref:{' '}
                <strong>{overview.ref}</strong>
              </p>
            </div>
            <button
              type="button"
              className="workspace-primary-action"
              disabled={!overview.can_dispatch || dispatching}
              onClick={() => void handleDispatch()}
            >
              {dispatching
                ? 'Dispatching…'
                : overview.can_dispatch
                  ? 'Run workflow'
                  : 'Dispatch unavailable'}
            </button>
            {!overview.can_dispatch && overview.message && (
              <p className="pipeline-setup-message">{overview.message}</p>
            )}
          </section>

          <section className="suite-table-card" aria-label="Recent workflow runs">
            <div className="pipeline-runs-heading">
              <h2>Recent workflow runs</h2>
              <span>Latest 10 from GitHub Actions</span>
            </div>
            {overview.runs.length === 0 ? (
              <p>No runs are available for this workflow.</p>
            ) : (
              <div className="suite-table-scroll">
                <table className="suite-table">
                  <thead>
                    <tr>
                      <th scope="col">Run</th>
                      <th scope="col">Branch</th>
                      <th scope="col">Status</th>
                      <th scope="col">Started</th>
                      <th scope="col">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.runs.map((run) => (
                      <tr key={run.id}>
                        <th scope="row">
                          {run.name} #{run.run_number}
                        </th>
                        <td>{run.branch}</td>
                        <td>
                          <span
                            className={`suite-status suite-status-${run.conclusion ?? run.status}`}
                          >
                            {run.conclusion ?? run.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{new Date(run.created_at).toLocaleString()}</td>
                        <td>
                          <a
                            className="suite-text-action pipeline-run-link"
                            href={run.html_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open run
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  )
}
