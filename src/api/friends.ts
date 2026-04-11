import { apiFetch } from './client'
import type { FriendshipRead, FriendUser, Page } from '../types'

export async function fetchPendingRequests(): Promise<FriendshipRead[]> {
  const page = await apiFetch<Page<FriendshipRead>>('/friends/pending?size=100')
  return page.items
}

export async function fetchFriends(): Promise<FriendUser[]> {
  const page = await apiFetch<Page<FriendUser>>('/friends/?size=100')
  return page.items
}

export async function fetchSentRequests(): Promise<FriendshipRead[]> {
  const page = await apiFetch<Page<FriendshipRead>>('/friends/sent?size=100')
  return page.items
}

export function requestFriendship(username: string): Promise<FriendshipRead> {
  return apiFetch<FriendshipRead>(`/friends/request/${encodeURIComponent(username)}`, {
    method: 'POST',
  })
}

export function acceptFriendship(id: number): Promise<FriendshipRead> {
  return apiFetch<FriendshipRead>(`/friends/${id}/accept`, { method: 'POST' })
}

export function declineFriendship(id: number): Promise<FriendshipRead> {
  return apiFetch<FriendshipRead>(`/friends/${id}/decline`, { method: 'POST' })
}

export function removeFriendship(id: number): Promise<void> {
  return apiFetch<void>(`/friends/${id}`, { method: 'DELETE' })
}
