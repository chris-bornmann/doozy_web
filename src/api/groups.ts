import { apiFetch } from './client'
import type { GroupRead, Page } from '../types'

export async function fetchGroups(): Promise<GroupRead[]> {
  const page = await apiFetch<Page<GroupRead>>('/groups/?size=100')
  return page.items
}

export function createGroup(name: string): Promise<GroupRead> {
  return apiFetch<GroupRead>('/groups/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function deleteGroup(id: number): Promise<void> {
  return apiFetch<void>(`/groups/${id}`, { method: 'DELETE' })
}

export function addMember(id: number, username: string): Promise<GroupRead> {
  return apiFetch<GroupRead>(`/groups/${id}/members/${encodeURIComponent(username)}`, {
    method: 'POST',
  })
}

export function removeMember(id: number, username: string): Promise<void> {
  return apiFetch<void>(`/groups/${id}/members/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  })
}
