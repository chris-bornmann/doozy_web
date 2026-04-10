import { apiFetch } from './client'
import type { Permissions, UserRolesSummary } from '../types'

export function fetchMyPermissions(): Promise<Permissions> {
  return apiFetch<Permissions>('/rbac/me/permissions')
}

export function fetchUserRoles(): Promise<UserRolesSummary[]> {
  return apiFetch<UserRolesSummary[]>('/rbac/')
}

export function addUserRole(user_id: number, role: string): Promise<void> {
  return apiFetch<void>('/rbac/', {
    method: 'POST',
    body: JSON.stringify({ user_id, role }),
  })
}

export function removeUserRole(user_id: number, role: string): Promise<void> {
  return apiFetch<void>('/rbac/', {
    method: 'DELETE',
    body: JSON.stringify({ user_id, role }),
  })
}
