import { useState, FormEvent } from 'react'
import { loginWithPassword, createGoogleLoginUrl } from '../api/auth'
import { useAuth } from '../context/AuthContext'

interface Props {
  onSuccess: () => void
}

export default function SessionExpiredModal({ onSuccess }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { refreshUser } = useAuth()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginWithPassword(username, password)
      await refreshUser()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="session-expired-title">
        <div className="modal-header">
          <h2 id="session-expired-title">Session Expired</h2>
        </div>
        <p style={{ color: 'var(--ink-400)', fontSize: 14, margin: '0 0 16px' }}>
          Your session has expired. Please sign in to continue.
        </p>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-field">
            <label className="input-label" htmlFor="se-username">Username</label>
            <input
              id="se-username"
              type="text"
              className="field-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div className="modal-field">
            <label className="input-label" htmlFor="se-password">Password</label>
            <input
              id="se-password"
              type="password"
              className="field-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="modal-error">{error}</p>}
          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? <span className="btn-loading"><span className="btn-spinner" />Signing in…</span>
                : 'Sign In'}
            </button>
          </div>
        </form>
        <div className="login-divider" style={{ margin: '16px 0 12px' }}>
          <div className="login-divider-line" />
          <span className="login-divider-text">or</span>
          <div className="login-divider-line" />
        </div>
        <button
          type="button"
          className="btn-google"
          onClick={() => { window.location.href = createGoogleLoginUrl() }}
          style={{ width: '100%' }}
        >
          <GoogleIcon />
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
