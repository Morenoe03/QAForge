import { useEffect, useState, type FormEvent } from 'react'
import {
  createTestCase,
  deleteTestCase,
  listTestCases,
  updateTestCase,
  type TestCase,
  type TestCaseInput,
  type TestCaseQuery,
} from '../../api/testCases'
import { listTestSuites, type TestSuite } from '../../api/testSuites'

type AppliedFilters = Pick<
  TestCaseQuery,
  'search' | 'suiteId' | 'priority' | 'status'
>
type TestCaseFilterForm = {
  search: string
  suiteId: string
  priority: TestCaseInput['priority'] | ''
  status: TestCaseInput['status'] | ''
}
type TestCaseForm = Omit<TestCaseInput, 'steps' | 'tags'> & {
  stepsText: string
  tagsText: string
}

const pageSize = 10
const emptyFilters: AppliedFilters = {}
const emptyFilterForm: TestCaseFilterForm = {
  search: '',
  suiteId: '',
  priority: '',
  status: '',
}
const emptyForm: TestCaseForm = {
  title: '',
  description: '',
  preconditions: '',
  stepsText: '',
  expected_result: '',
  priority: 'medium',
  test_type: 'manual',
  status: 'draft',
  tagsText: '',
  suite_ids: [],
}

const priorities: TestCaseInput['priority'][] = ['low', 'medium', 'high', 'critical']
const testTypes: TestCaseInput['test_type'][] = ['manual', 'automated']
const testCaseStatuses: TestCaseInput['status'][] = [
  'draft',
  'active',
  'deprecated',
]

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  return fallback
}

function toInput(form: TestCaseForm): TestCaseInput {
  return {
    title: form.title.trim(),
    description: form.description?.trim() || null,
    preconditions: form.preconditions?.trim() || null,
    steps: form.stepsText
      .split(/\r?\n/)
      .map((step) => step.trim())
      .filter(Boolean),
    expected_result: form.expected_result?.trim() || null,
    priority: form.priority,
    test_type: form.test_type,
    status: form.status,
    tags: form.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    suite_ids: form.suite_ids,
  }
}

function caseIdentifier(id: number): string {
  return `TC-${String(id).padStart(5, '0')}`
}

export default function TestCasesPage() {
  const [cases, setCases] = useState<TestCase[]>([])
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [totalCases, setTotalCases] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AppliedFilters>(emptyFilters)
  const [filterForm, setFilterForm] =
    useState<TestCaseFilterForm>(emptyFilterForm)
  const [suitesLoading, setSuitesLoading] = useState(true)
  const [casesLoading, setCasesLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [form, setForm] = useState<TestCaseForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

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
        if (!controller.signal.aborted) setSuitesLoading(false)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void listTestCases(
      {
        ...filters,
        page,
        pageSize,
      },
      controller.signal,
    )
      .then((result) => {
        const lastPage = Math.max(1, Math.ceil(result.total / result.page_size))
        if (page > lastPage) {
          setCasesLoading(true)
          setPage(lastPage)
          return
        }
        setCases(result.items)
        setTotalCases(result.total)
        setCasesLoading(false)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(errorMessage(error, 'Could not load test cases.'))
          setCasesLoading(false)
        }
      })

    return () => controller.abort()
  }, [filters, page, refreshKey])

  const loading = suitesLoading || casesLoading
  const pageCount = Math.max(1, Math.ceil(totalCases / pageSize))
  const firstItem = totalCases === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalCases)
  const hasFilters = Boolean(
    filters.search || filters.suiteId || filters.priority || filters.status,
  )

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoadError(null)
    setCasesLoading(true)
    setPage(1)
    setFilters({
      search: filterForm.search.trim() || undefined,
      suiteId: filterForm.suiteId ? Number(filterForm.suiteId) : undefined,
      priority: filterForm.priority || undefined,
      status: filterForm.status || undefined,
    })
  }

  function clearFilters() {
    const filtersChanged =
      filters.search || filters.suiteId || filters.priority || filters.status
    setFilterForm(emptyFilterForm)
    setFilters(emptyFilters)
    setPage(1)
    setLoadError(null)
    if (filtersChanged || page !== 1) setCasesLoading(true)
  }

  function openCreateForm() {
    setEditingCase(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(testCase: TestCase) {
    setEditingCase(testCase)
    setForm({
      title: testCase.title,
      description: testCase.description ?? '',
      preconditions: testCase.preconditions ?? '',
      stepsText: testCase.steps.join('\n'),
      expected_result: testCase.expected_result ?? '',
      priority: testCase.priority,
      test_type: testCase.test_type,
      status: testCase.status,
      tagsText: testCase.tags.join(', '),
      suite_ids: testCase.suite_ids,
    })
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingCase(null)
    setForm(emptyForm)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim()) {
      setFormError('Title cannot be blank.')
      return
    }

    setSaving(true)
    setFormError(null)
    const input = toInput(form)

    try {
      if (editingCase) {
        await updateTestCase(editingCase.id, input)
      } else {
        await createTestCase(input)
      }
      closeForm()
      setLoadError(null)
      setCasesLoading(true)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setFormError(errorMessage(error, 'Could not save the test case.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(testCase: TestCase) {
    if (!window.confirm(`Delete the test case "${testCase.title}"?`)) return

    setDeletingId(testCase.id)
    setLoadError(null)
    try {
      await deleteTestCase(testCase.id)
      setCasesLoading(true)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setLoadError(errorMessage(error, 'Could not delete the test case.'))
    } finally {
      setDeletingId(null)
    }
  }

  let formTitle = 'Create test case'
  let submitLabel = 'Create case'
  if (editingCase) {
    formTitle = 'Edit test case'
    submitLabel = 'Save changes'
  }
  if (saving) submitLabel = 'Saving…'

  return (
    <main className="workspace-page">
      <div className="workspace-page-header">
        <div>
          <span className="workspace-eyebrow">QAForge workspace</span>
          <h1>Test Cases</h1>
          <p>Define, review, and maintain individual test scenarios.</p>
        </div>
        <button
          type="button"
          className="workspace-primary-action"
          onClick={openCreateForm}
        >
          Create test case
        </button>
      </div>

      {loadError && (
        <p className="suite-alert" role="alert">
          {loadError}
        </p>
      )}

      <form
        className="test-case-filters"
        aria-label="Search and filter test cases"
        onSubmit={applyFilters}
      >
        <label>
          Search test cases
          <input
            type="search"
            maxLength={200}
            placeholder="Title, steps, tags…"
            value={filterForm.search}
            onChange={(event) =>
              setFilterForm((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
          />
        </label>
        <label>
          Filter by suite
          <select
            value={filterForm.suiteId}
            onChange={(event) =>
              setFilterForm((current) => ({
                ...current,
                suiteId: event.target.value,
              }))
            }
          >
            <option value="">All suites</option>
            {suites.map((suite) => (
              <option key={suite.id} value={suite.id}>
                {suite.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filter by priority
          <select
            value={filterForm.priority}
            onChange={(event) => {
              const priority = priorities.find(
                (option) => option === event.target.value,
              )
              setFilterForm((current) => ({
                ...current,
                priority: priority ?? '',
              }))
            }}
          >
            <option value="">All priorities</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filter by status
          <select
            value={filterForm.status}
            onChange={(event) => {
              const testCaseStatus = testCaseStatuses.find(
                (option) => option === event.target.value,
              )
              setFilterForm((current) => ({
                ...current,
                status: testCaseStatus ?? '',
              }))
            }}
          >
            <option value="">All statuses</option>
            {testCaseStatuses.map((testCaseStatus) => (
              <option key={testCaseStatus} value={testCaseStatus}>
                {testCaseStatus}
              </option>
            ))}
          </select>
        </label>
        <div className="test-case-filter-actions">
          <button type="submit" className="workspace-primary-action">
            Apply filters
          </button>
          <button
            type="button"
            className="suite-secondary-action"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      </form>

      {formOpen && (
        <form
          className="suite-form"
          aria-label="Test case form"
          onSubmit={handleSubmit}
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
              rows={2}
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
            Preconditions
            <textarea
              rows={2}
              value={form.preconditions ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  preconditions: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Test steps (one per line)
            <textarea
              rows={4}
              value={form.stepsText}
              onChange={(event) =>
                setForm((current) => ({ ...current, stepsText: event.target.value }))
              }
            />
          </label>
          <label>
            Expected result
            <textarea
              rows={2}
              value={form.expected_result ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  expected_result: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={(event) => {
                const priority = priorities.find(
                  (option) => option === event.target.value,
                )
                if (priority) {
                  setForm((current) => ({ ...current, priority }))
                }
              }}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label>
            Test type
            <select
              value={form.test_type}
              onChange={(event) => {
                const testType = testTypes.find(
                  (option) => option === event.target.value,
                )
                if (testType) {
                  setForm((current) => ({ ...current, test_type: testType }))
                }
              }}
            >
              {testTypes.map((testType) => (
                <option key={testType} value={testType}>
                  {testType}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) => {
                const testCaseStatus = testCaseStatuses.find(
                  (option) => option === event.target.value,
                )
                if (testCaseStatus) {
                  setForm((current) => ({
                    ...current,
                    status: testCaseStatus,
                  }))
                }
              }}
            >
              {testCaseStatuses.map((testCaseStatus) => (
                <option key={testCaseStatus} value={testCaseStatus}>
                  {testCaseStatus}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tags (comma-separated)
            <input
              value={form.tagsText}
              onChange={(event) =>
                setForm((current) => ({ ...current, tagsText: event.target.value }))
              }
            />
          </label>
          <label>
            Test suites
            <select
              multiple
              value={form.suite_ids.map(String)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  suite_ids: Array.from(
                    event.target.selectedOptions,
                    (option) => Number(option.value),
                  ),
                }))
              }
            >
              {suites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name}
                </option>
              ))}
            </select>
          </label>
          {suites.length === 0 && (
            <p className="test-case-form-hint">
              No test suites are available. You can create this case without linking it.
            </p>
          )}
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
          <p>Loading test cases…</p>
        </section>
      ) : cases.length === 0 ? (
        <section className="workspace-empty-state" aria-label="Test cases">
          <div className="workspace-empty-icon" aria-hidden="true">
            +
          </div>
          <h2>{hasFilters ? 'No matching test cases' : 'No test cases yet'}</h2>
          <p>
            {hasFilters
              ? 'Try changing or clearing your search and filters.'
              : 'Create a test case to document a scenario and link it to suites.'}
          </p>
        </section>
      ) : (
        <section className="suite-table-card" aria-label="Test cases">
          <div className="suite-table-scroll">
            <table className="suite-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Test case</th>
                  <th scope="col">Details</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Suites</th>
                  <th scope="col">Tags</th>
                  <th scope="col">Updated</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cases.map((testCase) => {
                  let deleteLabel = 'Delete'
                  if (deletingId === testCase.id) deleteLabel = 'Deleting…'
                  const linkedSuiteNames = suites
                    .filter((suite) => testCase.suite_ids.includes(suite.id))
                    .map((suite) => suite.name)

                  return (
                    <tr key={testCase.id}>
                      <td>{caseIdentifier(testCase.id)}</td>
                      <th scope="row">
                        {testCase.title}
                        {testCase.description && (
                          <span className="test-case-description">
                            {testCase.description}
                          </span>
                        )}
                      </th>
                      <td>
                        <details className="test-case-details">
                          <summary>View details</summary>
                          {testCase.preconditions && (
                            <p>
                              <strong>Preconditions:</strong> {testCase.preconditions}
                            </p>
                          )}
                          {testCase.steps.length > 0 && (
                            <div>
                              <strong>Steps:</strong>
                              <ol>
                                {testCase.steps.map((step, index) => (
                                  <li key={`${testCase.id}-step-${index}`}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {testCase.expected_result && (
                            <p>
                              <strong>Expected result:</strong>{' '}
                              {testCase.expected_result}
                            </p>
                          )}
                        </details>
                      </td>
                      <td className="test-case-capitalized">{testCase.priority}</td>
                      <td className="test-case-capitalized">{testCase.test_type}</td>
                      <td>
                        <span className={`suite-status suite-status-${testCase.status}`}>
                          {testCase.status}
                        </span>
                      </td>
                      <td>{linkedSuiteNames.join(', ') || '—'}</td>
                      <td>{testCase.tags.join(', ') || '—'}</td>
                      <td>{new Date(testCase.updated_at).toLocaleDateString()}</td>
                      <td className="suite-row-actions">
                        <button
                          type="button"
                          className="suite-text-action"
                          onClick={() => openEditForm(testCase)}
                          aria-label={`Edit ${testCase.title}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="suite-text-action suite-delete-action"
                          onClick={() => void handleDelete(testCase)}
                          disabled={deletingId === testCase.id}
                          aria-label={`Delete ${testCase.title}`}
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

      {!loading && totalCases > 0 && (
        <nav className="test-case-pagination" aria-label="Test case pagination">
          <span role="status">
            Showing {firstItem}–{lastItem} of {totalCases} test cases
          </span>
          <div className="test-case-pagination-controls">
            <button
              type="button"
              className="suite-secondary-action"
              onClick={() => {
                setCasesLoading(true)
                setPage((current) => Math.max(1, current - 1))
              }}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              className="suite-secondary-action"
              onClick={() => {
                setCasesLoading(true)
                setPage((current) => Math.min(pageCount, current + 1))
              }}
              disabled={page >= pageCount}
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </main>
  )
}
