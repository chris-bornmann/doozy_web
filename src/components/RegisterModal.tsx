import { useState, useRef, useEffect, type FormEvent } from 'react'
import { registerUser } from '../api/auth'

interface RegisterModalProps {
  onClose: () => void
}

type ModalState = 'form' | 'success'

export default function RegisterModal({ onClose }: RegisterModalProps) {
  const [modalState, setModalState] = useState<ModalState>('form')

  // Form fields
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function validate(): string | null {
    // username (email) constraints from spec: minLength 8, maxLength 32
    if (email.length < 8) return 'Email must be at least 8 characters.'
    if (email.length > 32) return 'Email must be 32 characters or fewer.'

    // full_name: required, maxLength 128
    if (!fullName.trim()) return 'Full name is required.'
    if (fullName.length > 128) return 'Full name must be 128 characters or fewer.'

    // password constraints from spec: minLength 10, maxLength 32
    if (password.length < 10) return 'Password must be at least 10 characters.'
    if (password.length > 32) return 'Password must be 32 characters or fewer.'

    if (password !== confirmPassword) return 'Passwords do not match.'

    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setError('')
    setSaving(true)
    try {
      await registerUser(email.trim(), password, fullName.trim())
      setModalState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal register-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
      >
        {modalState === 'form' ? (
          <>
            <div className="modal-header">
              <h2 id="register-title" className="modal-title">Create Account</h2>
              <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {/* Email / username */}
              <div className="modal-field">
                <label className="modal-label" htmlFor="reg-email">
                  Email Address <span className="modal-required">*</span>
                </label>
                <input
                  id="reg-email"
                  ref={emailRef}
                  type="email"
                  className="field-input"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="you@example.com"
                  minLength={8}
                  maxLength={32}
                  required
                  autoComplete="email"
                />
                <span className="modal-char-count">{email.length}/32</span>
              </div>

              {/* Full name */}
              <div className="modal-field">
                <label className="modal-label" htmlFor="reg-fullname">
                  Full Name <span className="modal-required">*</span>
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  className="field-input"
                  value={fullName}
                  onChange={e => { setFullName(e.target.value); setError('') }}
                  placeholder="Jane Smith"
                  maxLength={128}
                  required
                  autoComplete="name"
                />
              </div>

              {/* Password */}
              <div className="modal-field">
                <label className="modal-label" htmlFor="reg-password">
                  Password <span className="modal-required">*</span>
                </label>
                <input
                  id="reg-password"
                  type="password"
                  className="field-input"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="At least 10 characters"
                  minLength={10}
                  maxLength={32}
                  required
                  autoComplete="new-password"
                />
                <span className="modal-char-count">{password.length}/32</span>
              </div>

              {/* Confirm password */}
              <div className="modal-field">
                <label className="modal-label" htmlFor="reg-confirm">
                  Confirm Password <span className="modal-required">*</span>
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  className="field-input"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                  placeholder="Repeat your password"
                  minLength={10}
                  maxLength={32}
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="modal-error">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <span className="btn-loading"><span className="btn-spinner" />Creating account…</span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="modal-header">
              <h2 id="register-title" className="modal-title">Check Your Email</h2>
            </div>

            <div className="register-success">
              <div className="register-success-icon">
                <EnvelopeIcon />
              </div>
              <p className="register-success-heading">Almost there!</p>
              <p className="register-success-body">
                We've sent a confirmation link to <strong>{email}</strong>.
                Click the link in that email to activate your account and complete registration.
              </p>
              <p className="register-success-note">
                Didn't receive it? Check your spam folder, or try registering again.
              </p>
            </div>

            <div className="modal-actions" style={{ padding: '0 24px 24px' }}>
              <button className="btn-primary" onClick={onClose}>
                Return to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function EnvelopeIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="4" y="10" width="32" height="22" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 13l16 11 16-11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
