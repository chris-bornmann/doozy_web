import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { getToken, clearToken } from '../api/client'
import { fetchCurrentUser } from '../api/auth'
import { fetchMyPermissions } from '../api/rbac'
import { fetchPendingRequests } from '../api/friends'
import type { User, Permissions } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  permissions: Permissions
  pendingFriendCount: number
  loading: boolean
  sessionExpired: boolean
  can: (resource: string, action: string) => boolean
  logout: () => void
  refreshUser: () => Promise<void>
  clearSessionExpired: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken_] = useState<string | null>(getToken)
  const [permissions, setPermissions] = useState<Permissions>({})
  const [pendingFriendCount, setPendingFriendCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const userRef = useRef(user)

  const refreshUser = useCallback(async () => {
    try {
      const [me, perms, pending] = await Promise.all([
        fetchCurrentUser(),
        fetchMyPermissions(),
        fetchPendingRequests(),
      ])
      setUser(me)
      setPermissions(perms)
      setPendingFriendCount(pending.length)
    } catch {
      clearToken()
      setToken_(null)
      setUser(null)
      setPermissions({})
      setPendingFriendCount(0)
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

  // Keep ref current so the auth:expired handler can check without a stale closure
  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    const handler = () => {
      if (userRef.current !== null) setSessionExpired(true)
    }
    window.addEventListener('auth:expired', handler)
    return () => window.removeEventListener('auth:expired', handler)
  }, [])

  const clearSessionExpired = useCallback(() => setSessionExpired(false), [])

  const logout = useCallback(() => {
    clearToken()
    setToken_(null)
    setUser(null)
    setPermissions({})
    setPendingFriendCount(0)
    setSessionExpired(false)
  }, [])

  const can = useCallback(
    (resource: string, action: string) => permissions[resource]?.includes(action) ?? false,
    [permissions],
  )

  return (
    <AuthContext.Provider value={{ user, token, permissions, pendingFriendCount, loading, sessionExpired, can, logout, refreshUser, clearSessionExpired }}>
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
