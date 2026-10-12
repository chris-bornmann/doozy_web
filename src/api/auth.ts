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

// ── Google sign-in: OAuth "state" ───────────────────────────────────────────
// Protects against login CSRF: without it, an attacker could send a victim a
// link that silently signs them in to the *attacker's* account, and anything
// the victim then creates would land where the attacker can read it.
//
// Before redirecting to Google we generate a random value, remember it in
// sessionStorage (per browser tab), and send it along. The backend passes it
// through Google and back to /auth/callback, which only accepts the token if
// the returned value matches the one remembered here. A login this tab didn't
// start has no matching value, so it is rejected.
const OAUTH_STATE_KEY = 'oauth_state'

// 32 random bytes, base64url-encoded: 43 URL-safe characters, which matches
// the format the backend accepts.
function generateOAuthState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Starts a new Google sign-in: remembers a fresh state value for this tab
// and returns the backend URL to navigate to.
export function createGoogleLoginUrl(): string {
  const state = generateOAuthState()
  sessionStorage.setItem(OAUTH_STATE_KEY, state)
  return `${API_BASE_URL}/login/google?state=${encodeURIComponent(state)}`
}

// Returns true only if `returnedState` is the value this tab generated when it
// started signing in. The stored value is removed either way, so it can only
// be used once.
export function consumeOAuthState(returnedState: string | null): boolean {
  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(OAUTH_STATE_KEY)
  return expectedState !== null && returnedState === expectedState
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
