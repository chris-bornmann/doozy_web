import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getToken, clearToken } from '../api/client'
import { fetchCurrentUser } from '../api/auth'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken_] = useState<string | null>(getToken)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchCurrentUser()
      setUser(me)
    } catch {
      clearToken()
      setToken_(null)
      setUser(null)
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
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, logout, refreshUser }}>
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
