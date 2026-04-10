import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { setToken } from './api/client'
import LoginPage from './pages/LoginPage'
import ItemsPage from './pages/ItemsPage'
import RbacPage from './pages/RbacPage'

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
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="*" element={<Navigate to={user ? '/items' : '/login'} replace />} />
    </Routes>
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
