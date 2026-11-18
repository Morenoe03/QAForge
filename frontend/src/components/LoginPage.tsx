import { useState, type FormEvent } from 'react'
import { login, type UserProfile } from '../api/auth'
import BrandMark from './BrandMark'

type LoginPageProps = {
  initialError?: string | null
  onLogin: (user: UserProfile) => void
}

export default function LoginPage({ initialError, onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      onLogin(await login(username.trim(), password))
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to sign in. Please try again.',
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
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to continue to your QAForge workspace.</p>
        </div>
        <form className="suite-form login-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              autoComplete="username"
              autoFocus
              maxLength={100}
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
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
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="login-demo-note">
          Local demo credentials are documented in the README.
        </p>
      </section>
    </main>
  )
}
