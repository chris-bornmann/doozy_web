import { API_BASE_URL } from '../config'

export function getToken(): string | null {
  return localStorage.getItem('access_token')
}

export function setToken(token: string): void {
  localStorage.setItem('access_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('access_token')
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const resp = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!resp.ok) {
    let message = `HTTP ${resp.status}`
    try {
      const err = await resp.json()
      message = (err as { detail?: string }).detail ?? message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  // Some endpoints return empty 200 bodies
  const text = await resp.text()
  return text ? (JSON.parse(text) as T) : ({} as T)
}
