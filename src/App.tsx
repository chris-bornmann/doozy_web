import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { setToken } from './api/client'
import LoginPage from './pages/LoginPage'
import ItemsPage from './pages/ItemsPage'
import RbacPage from './pages/RbacPage'
import FriendsPage from './pages/FriendsPage'
import GroupsPage from './pages/GroupsPage'

// Handles the OAuth callback redirect from the backend.
// The backend should redirect to /auth/callback?token=<jwt>
// or to /?token=<jwt> after a successful Google OAuth flow.
function OAuthCallback() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token = params.get('token') ?? params.get('access_token')
    if (token) {
      setToken(token)
      refreshUser().then(() => navigate('/items', { replace: true }))
    } else {
      navigate('/login', { replace: true })
    }
  }, [location.search, navigate, refreshUser])

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
  const { user, loading, refreshUser } = useAuth()

  // Check for token in URL at root (backend may redirect here)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Check query string first, then hash fragment (Google OAuth returns #access_token=...&token_type=bearer)
    const queryParams = new URLSearchParams(location.search)
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const token = queryParams.get('token') ?? queryParams.get('access_token')
      ?? hashParams.get('access_token') ?? hashParams.get('token')
    if (token) {
      setToken(token)
      // Refresh user then navigate; replace history so the token doesn't linger in the URL
      refreshUser().then(() => navigate('/items', { replace: true }))
    }
  }, [location.search, location.hash, navigate, refreshUser])

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
