import type { AppPage } from './Sidebar'

type WorkspacePageProps = {
  page: Exclude<AppPage, 'Test Forge'>
}

// Page-specific copy stays centralized while each navigation item has its own component.
const pageDetails: Record<WorkspacePageProps['page'], { description: string; action: string }> = {
  'Test Suites': {
    description: 'Organize reusable collections of automated tests.',
    action: 'Create test suite',
  },
  'Test Cases': {
    description: 'Define, review, and maintain individual test scenarios.',
    action: 'Create test case',
  },
  'Test Runs': {
    description: 'Track execution history and inspect run results.',
    action: 'Start a test run',
  },
  Failures: {
    description: 'Investigate failed tests and identify recurring issues.',
    action: 'Review failures',
  },
  Defects: {
    description: 'Manage defects discovered during quality checks.',
    action: 'Report a defect',
  },
  'API Tests': {
    description: 'Build and monitor automated API validation workflows.',
    action: 'Create API test',
  },
  Pipelines: {
    description: 'Connect QAForge to your delivery pipelines and automation.',
    action: 'Create pipeline',
  },
}

export default function WorkspacePage({ page }: WorkspacePageProps) {
  const details = pageDetails[page]

  return (
    <main className="workspace-page">
      {/* Shared workspace shell for feature pages that will receive their own data views. */}
      <div className="workspace-page-header">
        <div>
          <span className="workspace-eyebrow">QAForge workspace</span>
          <h1>{page}</h1>
          <p>{details.description}</p>
        </div>
        <button type="button" className="workspace-primary-action">
          {details.action}
        </button>
      </div>

      <section className="workspace-empty-state" aria-label={`${page} content`}>
        <div className="workspace-empty-icon" aria-hidden="true">
          +
        </div>
        <h2>Your {page.toLowerCase()} will appear here</h2>
        <p>Connect this view to your controller or API when the {page.toLowerCase()} workflow is ready.</p>
      </section>
    </main>
  )
}
