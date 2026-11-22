import { useState, type FormEvent } from 'react'
import { updateProfile, type UserProfile } from '../../api/auth'

type SettingsPageProps = {
  darkMode: boolean
  onProfileChange: (user: UserProfile) => void
  onThemeToggle: () => void
  user: UserProfile
}

export default function SettingsPage({
  darkMode,
  onProfileChange,
  onThemeToggle,
  user,
}: SettingsPageProps) {
  const [displayName, setDisplayName] = useState(user.display_name)
  const [email, setEmail] = useState(user.email)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updatedUser = await updateProfile({
        display_name: displayName.trim(),
        email: email.trim(),
      })
      onProfileChange(updatedUser)
      setSaved(true)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save profile settings.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="workspace-page">
      <div className="workspace-page-header">
        <div>
          <span className="workspace-eyebrow">Personalize your workspace</span>
          <h1>Settings</h1>
          <p>Update your profile and appearance preferences.</p>
        </div>
      </div>

      <section className="suite-form settings-form" aria-labelledby="profile-title">
        <h2 id="profile-title">Profile</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input readOnly value={user.username} />
          </label>
          <label>
            Display name
            <input
              autoComplete="name"
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
          {error && (
            <p className="suite-alert" role="alert">
              {error}
            </p>
          )}
          {saved && <p role="status">Profile settings saved.</p>}
          <div className="suite-form-actions">
            <button
              className="workspace-primary-action"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>

      <section className="suite-form settings-appearance" aria-labelledby="appearance-title">
        <h2 id="appearance-title">Appearance</h2>
        <div className="settings-theme-row">
          <div>
            <strong>Dark mode</strong>
            <p>Use a darker color theme across the workspace.</p>
          </div>
          <button
            aria-checked={darkMode}
            className="settings-theme-toggle"
            onClick={onThemeToggle}
            aria-label="Dark mode"
            role="switch"
            type="button"
          >
            {darkMode ? 'On' : 'Off'}
          </button>
        </div>
      </section>
    </main>
  )
}
