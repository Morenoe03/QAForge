import { useState, type ComponentType } from 'react'
import Header from './components/Header'
import MainContent from './components/MainContent'
import { Sidebar, type AppPage } from './components/Sidebar'
import ApiTestsPage from './components/pages/ApiTestsPage'
import DefectsPage from './components/pages/DefectsPage'
import FailuresPage from './components/pages/FailuresPage'
import PipelinesPage from './components/pages/PipelinesPage'
import TestCasesPage from './components/pages/TestCasesPage'
import TestRunsPage from './components/pages/TestRunsPage'
import TestSuitesPage from './components/pages/TestSuitesPage'
import './App.css'

const pageComponents: Record<Exclude<AppPage, 'Test Forge'>, ComponentType> = {
  'Test Suites': TestSuitesPage,
  'Test Cases': TestCasesPage,
  'Test Runs': TestRunsPage,
  Failures: FailuresPage,
  Defects: DefectsPage,
  'API Tests': ApiTestsPage,
  Pipelines: PipelinesPage,
}

function App() {
  // Keep the selected workspace page and theme at the application shell level.
  const [darkMode, setDarkMode] = useState(false)
  const [activePage, setActivePage] = useState<AppPage>('Test Forge')
  const ActivePage = activePage === 'Test Forge' ? null : pageComponents[activePage]

  return (
    <div className={`app-layout${darkMode ? ' dark-mode' : ''}`}>
      <Sidebar activePage={activePage} onSelect={setActivePage} />
      <div className="app-content">
        <Header
          darkMode={darkMode}
          onThemeToggle={() => setDarkMode((enabled) => !enabled)}
        />
        {ActivePage ? <ActivePage /> : <MainContent />}
      </div>
    </div>
  )
}

export default App
