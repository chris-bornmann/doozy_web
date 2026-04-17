import { apiFetch } from './client'
import type { Item, ItemRead, ItemFilter, Page, SortBy } from '../types'

export async function fetchItems(
  sortBy: SortBy = 'created_on',
  page = 1,
  size = 100,
  filter: ItemFilter = {},
): Promise<Page<ItemRead>> {
  // 'name' sort is handled client-side; pass 'created_on' to API
  const apiSort: string = sortBy === 'name' ? 'created_on' : sortBy
  const params = new URLSearchParams({
    sort_by: apiSort,
    page: String(page),
    size: String(size),
  })
  return apiFetch<Page<ItemRead>>(`/items/search?${params}`, {
    method: 'POST',
    body: JSON.stringify(filter),
  })
}

export async function createItem(
  name: string,
  description?: string | null,
  priority?: number | null,
  due_on?: string | null,
): Promise<{ id: number }> {
  const params = new URLSearchParams({ name })
  if (description != null) params.append('description', description)
  if (priority != null) params.append('priority', String(priority))
  if (due_on != null) params.append('due_on', due_on)
  return apiFetch<{ id: number }>(`/items/?${params}`, { method: 'POST' })
}

export async function patchItem(
  id: number,
  fields: Partial<Pick<Item, 'name' | 'description' | 'priority' | 'due_on' | 'state'>>,
): Promise<ItemRead> {
  const body: Record<string, string | number | null> = {}
  if (fields.name != null) body['name'] = fields.name
  if (fields.description != null) body['description'] = fields.description
  if (fields.priority != null) body['priority'] = fields.priority
  if (fields.state != null) body['state'] = fields.state
  if (fields.due_on !== undefined) body['due_on'] = fields.due_on ?? null
  return apiFetch<ItemRead>(`/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteItem(id: number): Promise<void> {
  await apiFetch(`/items/${id}`, { method: 'DELETE' })
}

export async function reorderItem(
  id: number,
  after_id: number | null,
): Promise<void> {
  await apiFetch(`/items/${id}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ after_id }),
  })
}

export async function assignToUser(itemId: number, username: string): Promise<void> {
  await apiFetch(`/items/${itemId}/assign/user/${encodeURIComponent(username)}`, { method: 'POST' })
}

export async function assignToGroup(itemId: number, groupId: number): Promise<void> {
  await apiFetch(`/items/${itemId}/assign/group/${groupId}`, { method: 'POST' })
}

export async function unassignGroup(itemId: number): Promise<void> {
  await apiFetch(`/items/${itemId}/assign/group`, { method: 'DELETE' })
}
