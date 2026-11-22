import { useState, type FormEvent } from 'react'
import { login, register, type UserProfile } from '../api/auth'
import BrandMark from './BrandMark'

type LoginPageProps = {
  initialError?: string | null
  onLogin: (user: UserProfile) => void
}

export default function LoginPage({ initialError, onLogin }: LoginPageProps) {
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const user = creatingAccount
        ? await register({
            username: username.trim(),
            password,
            display_name: displayName.trim(),
            email: email.trim(),
          })
        : await login(username.trim(), password)
      onLogin(user)
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to continue. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <BrandMark />
        <div className="login-heading">
          <h1 id="login-title">
            {creatingAccount ? 'Create your account' : 'Welcome back'}
          </h1>
          <p>
            {creatingAccount
              ? 'Create a private QAForge workspace to get started.'
              : 'Sign in to continue to your QAForge workspace.'}
          </p>
        </div>
        <form className="suite-form login-form" onSubmit={handleSubmit}>
          {creatingAccount && (
            <>
              <label>
                Display name
                <input
                  autoComplete="name"
                  autoFocus
                  maxLength={100}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  value={displayName}
                />
              </label>
              <label>
                Email
                <input
                  autoComplete="email"
                  maxLength={254}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
            </>
          )}
          <label>
            Username
            <input
              autoComplete="username"
              autoFocus={!creatingAccount}
              maxLength={100}
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={creatingAccount ? 'new-password' : 'current-password'}
              minLength={creatingAccount ? 8 : undefined}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && (
            <p className="suite-alert" role="alert">
              {error}
            </p>
          )}
          <button
            className="workspace-primary-action"
            disabled={submitting}
            type="submit"
          >
            {submitting
              ? creatingAccount
                ? 'Creating account…'
                : 'Signing in…'
              : creatingAccount
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>
        <p className="login-mode-switch">
          {creatingAccount ? 'Already have an account?' : 'New to QAForge?'}{' '}
          <button
            type="button"
            onClick={() => {
              setCreatingAccount((current) => !current)
              setError(null)
            }}
          >
            {creatingAccount ? 'Sign in' : 'Create account'}
          </button>
        </p>
        {!creatingAccount && (
          <p className="login-demo-note">
            Local demo credentials are documented in the README.
          </p>
        )}
      </section>
    </main>
  )
}
