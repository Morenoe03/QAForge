import { useEffect, useState, type ComponentType } from 'react'
import { getCurrentUser, logout, type UserProfile } from './api/auth'
import AccountPage from './components/pages/AccountPage'
import SettingsPage from './components/pages/SettingsPage'
import Header from './components/Header'
import LoginPage from './components/LoginPage'
import MainContent from './components/StatsDashboard'
import { Sidebar, type AppPage } from './components/Sidebar'
import ApiTestsPage from './components/pages/ApiTestsPage'
import DefectsPage from './components/pages/DefectsPage'
import FailuresPage from './components/pages/FailuresPage'
import PipelinesPage from './components/pages/PipelinesPage'
import TestCasesPage from './components/pages/TestCasesPage'
import TestRunsPage from './components/pages/TestRunsPage'
import TestSuitesPage from './components/pages/TestSuitesPage'
import './App.css'

const pageComponents: Record<
  Exclude<AppPage, 'Test Forge' | 'Account' | 'Settings'>,
  ComponentType
> = {
  'Test Suites': TestSuitesPage,
  'Test Cases': TestCasesPage,
  'Test Runs': TestRunsPage,
  Failures: FailuresPage,
  Defects: DefectsPage,
  'API Tests': ApiTestsPage,
  Pipelines: PipelinesPage,
}

function App() {
  const [darkMode, setDarkMode] = useState(
    () => window.localStorage.getItem('qaforge-theme') === 'dark',
  )
  const [activePage, setActivePage] = useState<AppPage>('Test Forge')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [appError, setAppError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch((error: unknown) => {
        if (active) {
          setAuthError(
            error instanceof Error ? error.message : 'Unable to reach the QAForge API.',
          )
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('qaforge-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  async function handleLogout() {
    try {
      await logout()
      setUser(null)
      setActivePage('Test Forge')
      setAppError(null)
    } catch (error) {
      setAppError(
        error instanceof Error ? error.message : 'Unable to sign out. Please try again.',
      )
    }
  }

  if (checkingSession) {
    return (
      <main className="login-page" role="status">
        Checking your session…
      </main>
    )
  }

  if (!user) {
    return (
      <div className="app-layout">
        <LoginPage
          initialError={authError}
          onLogin={(signedInUser) => {
            setUser(signedInUser)
            setAuthError(null)
          }}
        />
      </div>
    )
  }

  const ActivePage =
    activePage === 'Test Forge' ||
    activePage === 'Account' ||
    activePage === 'Settings'
      ? null
      : pageComponents[activePage]

  return (
    <div className={`app-layout${darkMode ? ' dark-mode' : ''}`}>
      <Sidebar
        activePage={activePage}
        mobileOpen={mobileNavOpen}
        onLogout={() => void handleLogout()}
        onSelect={(page) => {
          setActivePage(page)
          setMobileNavOpen(false)
        }}
        user={user}
      />
      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      )}
      <div className="app-content">
        <Header
          darkMode={darkMode}
          menuOpen={mobileNavOpen}
          onMenuToggle={() => setMobileNavOpen((open) => !open)}
          onThemeToggle={() => setDarkMode((enabled) => !enabled)}
        />
        {appError && (
          <p className="suite-alert app-notice" role="alert">
            {appError}
          </p>
        )}
        {activePage === 'Test Forge' && <MainContent />}
        {ActivePage && <ActivePage />}
        {activePage === 'Account' && (
          <AccountPage
            onOpenSettings={() => setActivePage('Settings')}
            user={user}
          />
        )}
        {activePage === 'Settings' && (
          <SettingsPage
            darkMode={darkMode}
            onProfileChange={setUser}
            onThemeToggle={() => setDarkMode((enabled) => !enabled)}
            user={user}
          />
        )}
      </div>
    </div>
  )
}

export default App
