import { UserRound } from 'lucide-react'
import type { UserProfile } from '../../api/auth'

type AccountPageProps = {
  onOpenSettings: () => void
  user: UserProfile
}

export default function AccountPage({
  onOpenSettings,
  user,
}: AccountPageProps) {
  return (
    <main className="workspace-page">
      <div className="workspace-page-header">
        <div>
          <span className="workspace-eyebrow">Your QAForge profile</span>
          <h1>Account</h1>
          <p>View the account currently signed in to this workspace.</p>
        </div>
      </div>
      <section className="suite-form account-card" aria-label="Account details">
        <div className="account-avatar" aria-hidden="true">
          <UserRound size={28} />
        </div>
        <dl className="account-details">
          <div>
            <dt>Display name</dt>
            <dd>{user.display_name}</dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
        <button
          className="workspace-primary-action"
          onClick={onOpenSettings}
          type="button"
        >
          Edit account settings
        </button>
      </section>
    </main>
  )
}
