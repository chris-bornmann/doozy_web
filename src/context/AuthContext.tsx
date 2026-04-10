import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getToken, clearToken } from '../api/client'
import { fetchCurrentUser } from '../api/auth'
import { fetchMyPermissions } from '../api/rbac'
import type { User, Permissions } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  permissions: Permissions
  loading: boolean
  can: (resource: string, action: string) => boolean
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken_] = useState<string | null>(getToken)
  const [permissions, setPermissions] = useState<Permissions>({})
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const [me, perms] = await Promise.all([fetchCurrentUser(), fetchMyPermissions()])
      setUser(me)
      setPermissions(perms)
    } catch {
      clearToken()
      setToken_(null)
      setUser(null)
      setPermissions({})
    }
  }, [])

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token, refreshUser])

  // Sync token from localStorage (for OAuth redirect flow)
  useEffect(() => {
    const stored = getToken()
    if (stored && stored !== token) {
      setToken_(stored)
    }
  }, [token])

  const logout = useCallback(() => {
    clearToken()
    setToken_(null)
    setUser(null)
    setPermissions({})
  }, [])

  const can = useCallback(
    (resource: string, action: string) => permissions[resource]?.includes(action) ?? false,
    [permissions],
  )

  return (
    <AuthContext.Provider value={{ user, token, permissions, loading, can, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
