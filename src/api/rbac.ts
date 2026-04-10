import { apiFetch } from './client'
import type { UserRolesSummary } from '../types'

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
