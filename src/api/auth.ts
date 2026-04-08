import { API_BASE_URL } from '../config'
import { apiFetch, setToken } from './client'
import type { Token, User } from '../types'

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<Token> {
  const body = new URLSearchParams({ username, password, grant_type: 'password' })

  const resp = await fetch(`${API_BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!resp.ok) {
    let message = 'Login failed'
    try {
      const err = await resp.json()
      message = (err as { detail?: string }).detail ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const token = await resp.json() as Token
  setToken(token.access_token)
  return token
}

export function getGoogleLoginUrl(): string {
  return `${API_BASE_URL}/login/google`
}

export async function fetchCurrentUser(): Promise<User> {
  return apiFetch<User>('/users/me')
}

export async function registerUser(
  username: string,
  password: string,
  full_name: string,
): Promise<User> {
  return apiFetch<User>('/users/', {
    method: 'POST',
    body: JSON.stringify({ username, password, full_name }),
  })
}
