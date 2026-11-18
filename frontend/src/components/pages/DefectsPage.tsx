import { useEffect, useState, type FormEvent } from 'react'
import {
  createDefect,
  deleteDefect,
  listDefects,
  updateDefect,
  type Defect,
  type DefectInput,
  type DefectSeverity,
  type DefectStatus,
} from '../../api/defects'
import { listFailures, type Failure } from '../../api/testRuns'

const severities: DefectSeverity[] = ['low', 'medium', 'high', 'critical']
const statuses: DefectStatus[] = ['open', 'in_progress', 'resolved', 'closed']
const emptyForm: DefectInput = {
  title: '',
  description: '',
  severity: 'medium',
  status: 'open',
  test_run_result_id: null,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([])
  const [failures, setFailures] = useState<Failure[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null)
  const [form, setForm] = useState<DefectInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      listDefects(controller.signal),
      listFailures(controller.signal),
    ])
      .then(([loadedDefects, loadedFailures]) => {
        setDefects(loadedDefects)
        setFailures(loadedFailures)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(errorMessage(error, 'Could not load defects.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  function openCreateForm() {
    setEditingDefect(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(defect: Defect) {
    setEditingDefect(defect)
    setForm({
      title: defect.title,
      description: defect.description ?? '',
      severity: defect.severity,
      status: defect.status,
      test_run_result_id: defect.test_run_result_id,
    })
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingDefect(null)
    setForm(emptyForm)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim()) {
      setFormError('Defect title cannot be blank.')
      return
    }

    setSaving(true)
    setFormError(null)
    setLoadError(null)
    const input: DefectInput = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || null,
    }
    try {
      if (editingDefect) {
        const updated = await updateDefect(editingDefect.id, {
          title: input.title,
          description: input.description,
          severity: input.severity,
          status: input.status,
        })
        setDefects((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        )
      } else {
        const created = await createDefect(input)
        setDefects((current) => [created, ...current])
      }
      closeForm()
    } catch (error) {
      setFormError(errorMessage(error, 'Could not save the defect.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(defect: Defect) {
    if (!window.confirm(`Delete the defect "${defect.title}"?`)) return

    setDeletingId(defect.id)
    setLoadError(null)
    try {
      await deleteDefect(defect.id)
      setDefects((current) => current.filter((item) => item.id !== defect.id))
    } catch (error) {
      setLoadError(errorMessage(error, 'Could not delete the defect.'))
    } finally {
      setDeletingId(null)
    }
  }

  let formTitle = 'Report a defect'
  let submitLabel = 'Create defect'
  if (editingDefect) {
    formTitle = 'Edit defect'
    submitLabel = 'Save changes'
  }
  if (saving) submitLabel = 'Saving…'

  return (
    <main className="workspace-page">
      <div className="workspace-page-header">
        <div>
          <span className="workspace-eyebrow">QAForge workspace</span>
          <h1>Defects</h1>
          <p>Track issues discovered during test execution.</p>
        </div>
        <button
          type="button"
          className="workspace-primary-action"
          onClick={openCreateForm}
        >
          Report a defect
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
          aria-label="Defect form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <h2>{formTitle}</h2>
          <label>
            Title
            <input
              autoFocus
              required
              maxLength={200}
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
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
            Severity
            <select
              value={form.severity}
              onChange={(event) => {
                const severity = severities.find(
                  (option) => option === event.target.value,
                )
                if (severity) {
                  setForm((current) => ({ ...current, severity }))
                }
              }}
            >
              {severities.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) => {
                const defectStatus = statuses.find(
                  (option) => option === event.target.value,
                )
                if (defectStatus) {
                  setForm((current) => ({ ...current, status: defectStatus }))
                }
              }}
            >
              {statuses.map((defectStatus) => (
                <option key={defectStatus} value={defectStatus}>
                  {defectStatus.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Link to failed test result
            <select
              value={form.test_run_result_id ?? ''}
              disabled={Boolean(editingDefect)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  test_run_result_id: event.target.value
                    ? Number(event.target.value)
                    : null,
                }))
              }
            >
              <option value="">No linked failure</option>
              {failures.map((failure) => (
                <option key={failure.id} value={failure.id}>
                  {failure.run_name} — {failure.case_title}
                </option>
              ))}
            </select>
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
          <p>Loading defects…</p>
        </section>
      ) : defects.length === 0 ? (
        <section className="workspace-empty-state" aria-label="Defects">
          <div className="workspace-empty-icon" aria-hidden="true">
            +
          </div>
          <h2>No defects reported</h2>
          <p>Create a defect and optionally link it to a failed test result.</p>
        </section>
      ) : (
        <section className="suite-table-card" aria-label="Defect list">
          <div className="suite-table-scroll">
            <table className="suite-table">
              <thead>
                <tr>
                  <th scope="col">Defect</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Status</th>
                  <th scope="col">Failed test</th>
                  <th scope="col">Run</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {defects.map((defect) => (
                  <tr key={defect.id}>
                    <th scope="row">
                      {defect.title}
                      {defect.description && (
                        <span className="test-case-description">
                          {defect.description}
                        </span>
                      )}
                    </th>
                    <td className="test-case-capitalized">{defect.severity}</td>
                    <td>
                      <span className={`suite-status suite-status-${defect.status}`}>
                        {defect.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{defect.case_title || '—'}</td>
                    <td>{defect.run_name || '—'}</td>
                    <td className="suite-row-actions">
                      <button
                        type="button"
                        className="suite-text-action"
                        aria-label={`Edit ${defect.title}`}
                        onClick={() => openEditForm(defect)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="suite-text-action suite-delete-action"
                        aria-label={`Delete ${defect.title}`}
                        disabled={deletingId === defect.id}
                        onClick={() => void handleDelete(defect)}
                      >
                        {deletingId === defect.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
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
