import { useEffect, useState, type FormEvent } from 'react'
import {
  createApiTest,
  deleteApiTest,
  listApiTests,
  recordApiTestExecution,
  updateApiTest,
  type ApiTest,
  type ApiTestInput,
  type ApiTestMethod,
  type ApiTestOutcome,
} from '../../api/apiTests'

const methods: ApiTestMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const outcomes: ApiTestOutcome[] = ['passed', 'failed', 'blocked']
const emptyForm: ApiTestInput = {
  name: '',
  description: '',
  method: 'GET',
  endpoint: '',
  request_body: '',
  expected_status: null,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function isOutcome(value: string): value is ApiTestOutcome {
  return outcomes.includes(value as ApiTestOutcome)
}

export default function ApiTestsPage() {
  const [apiTests, setApiTests] = useState<ApiTest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingApiTest, setEditingApiTest] = useState<ApiTest | null>(null)
  const [form, setForm] = useState<ApiTestInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [recordingId, setRecordingId] = useState<number | null>(null)
  const [savingExecutionId, setSavingExecutionId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void listApiTests(controller.signal)
      .then(setApiTests)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(errorMessage(error, 'Could not load API tests.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  function openCreateForm() {
    setEditingApiTest(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(apiTest: ApiTest) {
    setEditingApiTest(apiTest)
    setForm({
      name: apiTest.name,
      description: apiTest.description ?? '',
      method: apiTest.method,
      endpoint: apiTest.endpoint,
      request_body: apiTest.request_body ?? '',
      expected_status: apiTest.expected_status,
    })
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingApiTest(null)
    setForm(emptyForm)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.endpoint.trim()) {
      setFormError('Name and endpoint cannot be blank.')
      return
    }

    setSaving(true)
    setFormError(null)
    setLoadError(null)
    const input: ApiTestInput = {
      ...form,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      endpoint: form.endpoint.trim(),
      request_body: form.request_body?.trim() || null,
    }
    try {
      if (editingApiTest) {
        const updated = await updateApiTest(editingApiTest.id, input)
        setApiTests((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        )
      } else {
        const created = await createApiTest(input)
        setApiTests((current) => [created, ...current])
      }
      closeForm()
    } catch (error) {
      setFormError(errorMessage(error, 'Could not save the API test.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleRecordExecution(
    event: FormEvent<HTMLFormElement>,
    apiTest: ApiTest,
  ) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const outcomeValue = data.get('outcome')
    if (typeof outcomeValue !== 'string' || !isOutcome(outcomeValue)) {
      setLoadError('Choose an outcome before saving the API test result.')
      return
    }

    const notesValue = data.get('notes')
    setSavingExecutionId(apiTest.id)
    setLoadError(null)
    try {
      const updated = await recordApiTestExecution(apiTest.id, {
        outcome: outcomeValue,
        notes: typeof notesValue === 'string' ? notesValue.trim() || null : null,
      })
      setApiTests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setRecordingId(null)
    } catch (error) {
      setLoadError(errorMessage(error, 'Could not save the API test result.'))
    } finally {
      setSavingExecutionId(null)
    }
  }

  async function handleDelete(apiTest: ApiTest) {
    if (!window.confirm(`Delete the API test "${apiTest.name}" and its history?`)) {
      return
    }

    setDeletingId(apiTest.id)
    setLoadError(null)
    try {
      await deleteApiTest(apiTest.id)
      setApiTests((current) => current.filter((item) => item.id !== apiTest.id))
    } catch (error) {
      setLoadError(errorMessage(error, 'Could not delete the API test.'))
    } finally {
      setDeletingId(null)
    }
  }

  let formTitle = 'Create API test'
  let submitLabel = 'Create API test'
  if (editingApiTest) {
    formTitle = 'Edit API test'
    submitLabel = 'Save changes'
  }
  if (saving) submitLabel = 'Saving…'

  return (
    <main className="workspace-page">
      <div className="workspace-page-header">
        <div>
          <span className="workspace-eyebrow">QAForge workspace</span>
          <h1>API Tests</h1>
          <p>Document API scenarios and manually track their outcomes.</p>
        </div>
        <button
          type="button"
          className="workspace-primary-action"
          onClick={openCreateForm}
        >
          Create API test
        </button>
      </div>

      <p className="api-test-notice">
        API definitions are documentation only. QAForge does not send requests
        to the endpoints shown here.
      </p>
      {loadError && (
        <p className="suite-alert" role="alert">
          {loadError}
        </p>
      )}

      {formOpen && (
        <form
          className="suite-form"
          aria-label="API test form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <h2>{formTitle}</h2>
          <label>
            Name
            <input
              autoFocus
              required
              maxLength={150}
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>
          <label>
            Description
            <textarea
              rows={2}
              maxLength={4000}
              value={form.description ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <label>
            HTTP method
            <select
              value={form.method}
              onChange={(event) => {
                const method = methods.find(
                  (option) => option === event.target.value,
                )
                if (method) setForm((current) => ({ ...current, method }))
              }}
            >
              {methods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label>
            Endpoint
            <input
              required
              maxLength={2048}
              placeholder="/api/v1/orders"
              value={form.endpoint}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  endpoint: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Request body
            <textarea
              rows={4}
              maxLength={20000}
              value={form.request_body ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  request_body: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Expected HTTP status
            <input
              type="number"
              min={100}
              max={599}
              value={form.expected_status ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  expected_status: event.target.value
                    ? Number(event.target.value)
                    : null,
                }))
              }
            />
          </label>
          {formError && (
            <p className="suite-alert" role="alert">
              {formError}
            </p>
          )}
          <div className="suite-form-actions">
            <button
              type="button"
              className="suite-secondary-action"
              onClick={closeForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="workspace-primary-action"
              disabled={saving}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <section className="workspace-empty-state" aria-live="polite">
          <p>Loading API tests…</p>
        </section>
      ) : apiTests.length === 0 ? (
        <section className="workspace-empty-state" aria-label="API tests">
          <div className="workspace-empty-icon" aria-hidden="true">
            +
          </div>
          <h2>No API tests defined</h2>
          <p>Create an API scenario, then record its outcome after manual testing.</p>
        </section>
      ) : (
        <div className="api-test-list" aria-label="API test definitions">
          {apiTests.map((apiTest) => (
            <section
              className="suite-table-card api-test-card"
              aria-label={`API test ${apiTest.name}`}
              key={apiTest.id}
            >
              <header className="api-test-heading">
                <div>
                  <h2>{apiTest.name}</h2>
                  <p>
                    <span className="api-test-method">{apiTest.method}</span>{' '}
                    <code>{apiTest.endpoint}</code>
                  </p>
                </div>
                <span
                  className={`suite-status suite-status-${apiTest.executions[0]?.outcome ?? 'pending'}`}
                >
                  {apiTest.executions[0]?.outcome ?? 'not run'}
                </span>
              </header>
              {apiTest.description && <p>{apiTest.description}</p>}
              <details className="api-test-details">
                <summary>Request and expected response</summary>
                {apiTest.request_body && (
                  <pre>{apiTest.request_body}</pre>
                )}
                <p>
                  <strong>Expected HTTP status:</strong>{' '}
                  {apiTest.expected_status ?? 'Not specified'}
                </p>
              </details>

              {apiTest.executions.length > 0 && (
                <details className="api-test-history">
                  <summary>
                    Result history ({apiTest.executions.length})
                  </summary>
                  <ul>
                    {apiTest.executions.map((execution) => (
                      <li key={execution.id}>
                        <strong>{execution.outcome}</strong> ·{' '}
                        {new Date(execution.recorded_at).toLocaleString()}
                        {execution.notes && ` · ${execution.notes}`}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {recordingId === apiTest.id && (
                <form
                  className="test-run-result-form"
                  aria-label={`Record API test result for ${apiTest.name}`}
                  onSubmit={(event) =>
                    void handleRecordExecution(event, apiTest)
                  }
                >
                  <label>
                    Outcome
                    <select name="outcome" required defaultValue="">
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
                    <input name="notes" maxLength={4000} />
                  </label>
                  <button
                    type="submit"
                    className="suite-secondary-action"
                    disabled={savingExecutionId === apiTest.id}
                  >
                    {savingExecutionId === apiTest.id
                      ? 'Saving…'
                      : 'Save outcome'}
                  </button>
                </form>
              )}

              <div className="api-test-actions">
                <button
                  type="button"
                  className="suite-secondary-action"
                  aria-label={`Record outcome for ${apiTest.name}`}
                  onClick={() =>
                    setRecordingId((current) =>
                      current === apiTest.id ? null : apiTest.id,
                    )
                  }
                >
                  Record outcome
                </button>
                <button
                  type="button"
                  className="suite-text-action"
                  aria-label={`Edit ${apiTest.name}`}
                  onClick={() => openEditForm(apiTest)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="suite-text-action suite-delete-action"
                  aria-label={`Delete ${apiTest.name}`}
                  disabled={deletingId === apiTest.id}
                  onClick={() => void handleDelete(apiTest)}
                >
                  {deletingId === apiTest.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
