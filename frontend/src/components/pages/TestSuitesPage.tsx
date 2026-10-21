import { useEffect, useState, type FormEvent } from 'react'
import {
  createTestSuite,
  deleteTestSuite,
  listTestSuites,
  updateTestSuite,
  type TestSuite,
  type TestSuiteInput,
} from '../../api/testSuites'

const emptyForm: TestSuiteInput = {
  name: '',
  description: '',
  status: 'active',
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  return fallback
}

export default function TestSuitesPage() {
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null)
  const [form, setForm] = useState<TestSuiteInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void listTestSuites(controller.signal)
      .then(setSuites)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(errorMessage(error, 'Could not load test suites.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  function openCreateForm() {
    setEditingSuite(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(suite: TestSuite) {
    setEditingSuite(suite)
    setForm({
      name: suite.name,
      description: suite.description ?? '',
      status: suite.status,
    })
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingSuite(null)
    setForm(emptyForm)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)

    const input = {
      ...form,
      name: form.name.trim(),
      description: form.description?.trim() || null,
    }

    try {
      if (editingSuite) {
        const updated = await updateTestSuite(editingSuite.id, input)
        setSuites((current) =>
          current.map((suite) => {
            if (suite.id !== updated.id) return suite
            return updated
          }),
        )
      } else {
        const created = await createTestSuite(input)
        setSuites((current) => [...current, created].sort((a, b) => a.id - b.id))
      }
      closeForm()
    } catch (error) {
      setFormError(errorMessage(error, 'Could not save the test suite.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(suite: TestSuite) {
    if (!window.confirm(`Delete the test suite "${suite.name}"?`)) return

    setDeletingId(suite.id)
    setLoadError(null)
    try {
      await deleteTestSuite(suite.id)
      setSuites((current) => current.filter((item) => item.id !== suite.id))
    } catch (error) {
      setLoadError(errorMessage(error, 'Could not delete the test suite.'))
    } finally {
      setDeletingId(null)
    }
  }

  let formTitle = 'Create test suite'
  let submitLabel = 'Create suite'
  if (editingSuite) {
    formTitle = 'Edit test suite'
    submitLabel = 'Save changes'
  }
  if (saving) submitLabel = 'Saving…'

  return (
    <main className="workspace-page">
      <div className="workspace-page-header">
        <div>
          <span className="workspace-eyebrow">QAForge workspace</span>
          <h1>Test Suites</h1>
          <p>Organize reusable collections of automated tests.</p>
        </div>
        <button
          type="button"
          className="workspace-primary-action"
          onClick={openCreateForm}
        >
          Create test suite
        </button>
      </div>

      {loadError && (
        <p className="suite-alert" role="alert">
          {loadError}
        </p>
      )}

      {formOpen && (
        <form className="suite-form" onSubmit={handleSubmit}>
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
              rows={3}
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
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          {formError && (
            <p className="suite-alert" role="alert">
              {formError}
            </p>
          )}
          <div className="suite-form-actions">
            <button type="button" className="suite-secondary-action" onClick={closeForm}>
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
          <p>Loading test suites…</p>
        </section>
      ) : suites.length === 0 ? (
        <section className="workspace-empty-state" aria-label="Test suites">
          <div className="workspace-empty-icon" aria-hidden="true">
            +
          </div>
          <h2>No test suites yet</h2>
          <p>Create a suite to start organizing your automated tests.</p>
        </section>
      ) : (
        <section className="suite-table-card" aria-label="Test suites">
          <div className="suite-table-scroll">
            <table className="suite-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Description</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {suites.map((suite) => {
                  let deleteLabel = 'Delete'
                  if (deletingId === suite.id) deleteLabel = 'Deleting…'

                  return (
                    <tr key={suite.id}>
                      <th scope="row">{suite.name}</th>
                      <td>{suite.description || '—'}</td>
                      <td>
                        <span className={`suite-status suite-status-${suite.status}`}>
                          {suite.status}
                        </span>
                      </td>
                      <td>{new Date(suite.created_at).toLocaleDateString()}</td>
                      <td className="suite-row-actions">
                        <button
                          type="button"
                          className="suite-text-action"
                          onClick={() => openEditForm(suite)}
                          aria-label={`Edit ${suite.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="suite-text-action suite-delete-action"
                          onClick={() => void handleDelete(suite)}
                          disabled={deletingId === suite.id}
                          aria-label={`Delete ${suite.name}`}
                        >
                          {deleteLabel}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
