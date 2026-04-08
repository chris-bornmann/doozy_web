import { apiFetch } from './client'
import type { Tag, Page } from '../types'

export async function fetchTags(match?: string): Promise<Tag[]> {
  const params = new URLSearchParams({ size: '20' })
  if (match) params.set('match', match)
  const page = await apiFetch<Page<Tag>>(`/tags/?${params}`)
  return page.items
}

export async function createTag(name: string): Promise<Tag> {
  return apiFetch<Tag>('/tags/', { method: 'POST', body: JSON.stringify({ name }) })
}

export async function fetchItemTags(itemId: number): Promise<Tag[]> {
  // The spec returns an untyped schema for this endpoint.
  // The server may return Tag[] directly or a Page<Tag> wrapper — handle both.
  const result = await apiFetch<Tag[] | Page<Tag>>(`/item_tags/?by=item&id=${itemId}`)
  if (Array.isArray(result)) return result
  if (result && typeof result === 'object' && Array.isArray((result as Page<Tag>).items)) {
    return (result as Page<Tag>).items
  }
  return []
}

export async function assignTag(itemId: number, tagId: number): Promise<void> {
  await apiFetch('/item_tags/', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId, tag_id: tagId }),
  })
}

export async function removeItemTag(itemId: number, tagId: number): Promise<void> {
  await apiFetch('/item_tags/', {
    method: 'DELETE',
    body: JSON.stringify({ item_id: itemId, tag_id: tagId }),
  })
}
