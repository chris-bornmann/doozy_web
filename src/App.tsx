import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { setToken } from './api/client'
import { consumeOAuthState } from './api/auth'
import SessionExpiredModal from './components/SessionExpiredModal'
import LoginPage from './pages/LoginPage'
import ItemsPage from './pages/ItemsPage'
import RbacPage from './pages/RbacPage'
import FriendsPage from './pages/FriendsPage'
import GroupsPage from './pages/GroupsPage'

// Handles the redirect back from the backend after Google sign-in:
//   /auth/callback#access_token=<jwt>&token_type=bearer&state=<state>
//
// This is the ONLY place the app accepts a token from a URL. Accepting one
// anywhere else (as the app used to, on every page and in the query string)
// lets an attacker send a link that silently signs the victim in to the
// attacker's account. The token is accepted only if:
//   - it arrives in the URL fragment (after "#"), which the backend uses and
//     which browsers never send to servers, and
//   - the returned `state` matches the one this tab generated when it started
//     signing in (see consumeOAuthState in api/auth.ts).
function OAuthCallback() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  // StrictMode runs effects twice in development; the stored state can only
  // be checked once, so make sure the callback is processed a single time.
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(window.location.hash.slice(1))
    const token = params.get('access_token')
    const stateMatches = consumeOAuthState(params.get('state'))

    // Remove the token from the address bar and browser history right away.
    window.history.replaceState(null, '', window.location.pathname)

    if (token && stateMatches) {
      setToken(token)
      refreshUser().then(() => navigate('/items', { replace: true }))
    } else {
      navigate('/login', {
        replace: true,
        state: { error: 'Sign-in could not be verified. Please sign in again.' },
      })
    }
  }, [navigate, refreshUser])

  return (
    <div className="flex items-center justify-center h-screen bg-ink-950">
      <p className="text-ink-400 font-mono text-sm tracking-widest animate-pulse">
        AUTHENTICATING…
      </p>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-ink-950">
        <p className="text-ink-400 font-mono text-sm tracking-widest animate-pulse">
          LOADING…
        </p>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function PendingFriendsToast() {
  const { pendingFriendCount, loading } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!loading && pendingFriendCount > 0) {
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 5000)
      return () => clearTimeout(t)
    }
  }, [loading]) // intentionally only fire once after loading completes

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 1000,
      background: 'var(--ink-800)',
      border: '1px solid var(--ink-700)',
      borderRadius: 8,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 14,
      color: 'var(--ink-200)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <span>
        You have {pendingFriendCount} pending friend request{pendingFriendCount !== 1 ? 's' : ''}.
      </span>
      <Link
        to="/friends"
        className="btn-primary btn-sm"
        onClick={() => setVisible(false)}
      >
        View
      </Link>
      <button
        className="btn-ghost btn-sm"
        onClick={() => setVisible(false)}
        style={{ padding: '4px 8px' }}
      >
        ✕
      </button>
    </div>
  )
}

function AppRoutes() {
  const { user, loading, sessionExpired, clearSessionExpired } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-ink-950">
        <p className="text-ink-400 font-mono text-sm tracking-widest animate-pulse">
          LOADING…
        </p>
      </div>
    )
  }

  return (
    <>
      {sessionExpired && <SessionExpiredModal onSuccess={clearSessionExpired} />}
      <PendingFriendsToast />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/items" replace /> : <LoginPage />}
        />
        <Route
          path="/items"
          element={
            <ProtectedRoute>
              <ItemsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rbac"
          element={
            <ProtectedRoute>
              <RbacPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <GroupsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="*" element={<Navigate to={user ? '/items' : '/login'} replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
