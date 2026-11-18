import { useEffect, useState, type FormEvent } from 'react'
import {
  createTestRun,
  deleteTestRun,
  listTestRuns,
  recordTestRunResult,
  type TestRun,
  type TestRunOutcome,
  type TestRunResult,
} from '../../api/testRuns'
import { listTestSuites, type TestSuite } from '../../api/testSuites'

const outcomes: TestRunOutcome[] = ['passed', 'failed', 'blocked', 'skipped']

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function isOutcome(value: string): value is TestRunOutcome {
  return outcomes.includes(value as TestRunOutcome)
}

function outcomeCount(run: TestRun, outcome: TestRunResult['outcome']): number {
  return run.results.filter((result) => result.outcome === outcome).length
}

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRun[]>([])
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [runName, setRunName] = useState('')
  const [suiteId, setSuiteId] = useState('')
  const [savingRun, setSavingRun] = useState(false)
  const [savingResultId, setSavingResultId] = useState<number | null>(null)
  const [deletingRunId, setDeletingRunId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      listTestSuites(controller.signal),
      listTestRuns(controller.signal),
    ])
      .then(([availableSuites, availableRuns]) => {
        setSuites(availableSuites)
        setRuns(availableRuns)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(errorMessage(error, 'Could not load test runs.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  async function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!runName.trim()) {
      setFormError('Run name cannot be blank.')
      return
    }

    setSavingRun(true)
    setFormError(null)
    setLoadError(null)
    try {
      const run = await createTestRun({
        name: runName.trim(),
        suite_id: Number(suiteId),
      })
      setRuns((current) => [run, ...current])
      setRunName('')
      setSuiteId('')
      setFormOpen(false)
    } catch (error) {
      setFormError(errorMessage(error, 'Could not start the test run.'))
    } finally {
      setSavingRun(false)
    }
  }

  async function handleRecordResult(
    event: FormEvent<HTMLFormElement>,
    run: TestRun,
    result: TestRunResult,
  ) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const outcomeValue = data.get('outcome')
    if (typeof outcomeValue !== 'string' || !isOutcome(outcomeValue)) {
      setLoadError('Choose an outcome before saving the test result.')
      return
    }

    const notesValue = data.get('notes')
    setSavingResultId(result.id)
    setLoadError(null)
    try {
      const updatedRun = await recordTestRunResult(run.id, result.id, {
        outcome: outcomeValue,
        notes:
          typeof notesValue === 'string' ? notesValue.trim() || null : null,
      })
      setRuns((current) =>
        current.map((item) => (item.id === updatedRun.id ? updatedRun : item)),
      )
    } catch (error) {
      setLoadError(errorMessage(error, 'Could not save the test result.'))
    } finally {
      setSavingResultId(null)
    }
  }

  async function handleDeleteRun(run: TestRun) {
    if (
      !window.confirm(
        `Delete the test run "${run.name}" and all of its recorded results?`,
      )
    ) {
      return
    }

    setDeletingRunId(run.id)
    setLoadError(null)
    try {
      await deleteTestRun(run.id)
      setRuns((current) => current.filter((item) => item.id !== run.id))
    } catch (error) {
      setLoadError(errorMessage(error, 'Could not delete the test run.'))
    } finally {
      setDeletingRunId(null)
    }
  }

  return (
    <main className="workspace-page">
      <div className="workspace-page-header">
        <div>
          <span className="workspace-eyebrow">QAForge workspace</span>
          <h1>Test Runs</h1>
          <p>Execute active test cases and record the result of each scenario.</p>
        </div>
        <button
          type="button"
          className="workspace-primary-action"
          onClick={() => {
            setFormError(null)
            setFormOpen((open) => !open)
          }}
        >
          Start a test run
        </button>
      </div>

      {loadError && (
        <p className="suite-alert" role="alert">
          {loadError}
        </p>
      )}

      {formOpen && (
        <form
          className="suite-form"
          aria-label="Start test run"
          onSubmit={(event) => void handleCreateRun(event)}
        >
          <h2>Start a test run</h2>
          <label>
            Run name
            <input
              autoFocus
              required
              maxLength={150}
              value={runName}
              onChange={(event) => setRunName(event.target.value)}
            />
          </label>
          <label>
            Test suite
            <select
              required
              value={suiteId}
              onChange={(event) => setSuiteId(event.target.value)}
            >
              <option value="">Choose an active suite</option>
              {suites
                .filter((suite) => suite.status === 'active')
                .map((suite) => (
                  <option key={suite.id} value={suite.id}>
                    {suite.name}
                  </option>
                ))}
            </select>
          </label>
          {suites.every((suite) => suite.status !== 'active') && (
            <p className="test-case-form-hint">
              Create an active suite with active test cases before starting a run.
            </p>
          )}
          {formError && (
            <p className="suite-alert" role="alert">
              {formError}
            </p>
          )}
          <div className="suite-form-actions">
            <button
              type="button"
              className="suite-secondary-action"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="workspace-primary-action"
              disabled={savingRun}
            >
              {savingRun ? 'Starting…' : 'Start run'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <section className="workspace-empty-state" aria-live="polite">
          <p>Loading test runs…</p>
        </section>
      ) : runs.length === 0 ? (
        <section className="workspace-empty-state" aria-label="Test runs">
          <div className="workspace-empty-icon" aria-hidden="true">
            +
          </div>
          <h2>No test runs yet</h2>
          <p>Start a run from an active suite to record execution results.</p>
        </section>
      ) : (
        <div className="test-run-list" aria-label="Test run history">
          {runs.map((run) => (
            <section className="suite-table-card test-run-card" key={run.id}>
              <header className="test-run-heading">
                <div>
                  <h2>{run.name}</h2>
                  <p>
                    {run.suite_name} ·{' '}
                    {new Date(run.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`suite-status suite-status-${run.status}`}>
                  {run.status.replace('_', ' ')}
                </span>
                <button
                  type="button"
                  className="suite-text-action suite-delete-action"
                  aria-label={`Delete run ${run.name}`}
                  disabled={deletingRunId === run.id}
                  onClick={() => void handleDeleteRun(run)}
                >
                  {deletingRunId === run.id ? 'Deleting…' : 'Delete run'}
                </button>
              </header>
              <p className="test-run-summary" aria-label={`Results for ${run.name}`}>
                {run.results.length} cases · {outcomeCount(run, 'passed')} passed ·{' '}
                {outcomeCount(run, 'failed')} failed ·{' '}
                {outcomeCount(run, 'pending')} pending
              </p>
              <div className="test-run-case-list">
                {run.results.map((result) => (
                  <article className="test-run-case" key={result.id}>
                    <div className="test-run-case-heading">
                      <strong>{result.case_title}</strong>
                      <span className={`suite-status suite-status-${result.outcome}`}>
                        {result.outcome}
                      </span>
                    </div>
                    <details>
                      <summary>Case steps and expected result</summary>
                      {result.case_snapshot.preconditions && (
                        <p>
                          <strong>Preconditions:</strong>{' '}
                          {result.case_snapshot.preconditions}
                        </p>
                      )}
                      <ol>
                        {result.case_snapshot.steps.map((step, index) => (
                          <li key={`${result.id}-step-${index}`}>{step}</li>
                        ))}
                      </ol>
                      <p>
                        <strong>Expected result:</strong>{' '}
                        {result.case_snapshot.expected_result || 'Not specified'}
                      </p>
                    </details>
                    {run.status === 'in_progress' && (
                      <form
                        className="test-run-result-form"
                        aria-label={`Record result for ${result.case_title}`}
                        onSubmit={(event) =>
                          void handleRecordResult(event, run, result)
                        }
                      >
                        <label>
                          Outcome
                          <select
                            name="outcome"
                            required
                            defaultValue={
                              result.outcome === 'pending' ? '' : result.outcome
                            }
                          >
                            <option value="">Choose an outcome</option>
                            {outcomes.map((outcome) => (
                              <option key={outcome} value={outcome}>
                                {outcome}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Notes
                          <input
                            name="notes"
                            maxLength={4000}
                            defaultValue={result.notes ?? ''}
                            placeholder="Optional result notes"
                          />
                        </label>
                        <button
                          type="submit"
                          className="suite-secondary-action"
                          disabled={savingResultId === result.id}
                        >
                          {savingResultId === result.id
                            ? 'Saving…'
                            : 'Save result'}
                        </button>
                      </form>
                    )}
                    {result.notes && (
                      <p className="test-run-result-notes">
                        <strong>Notes:</strong> {result.notes}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
