import { apiFetch } from './client'
import type { Tag, Item, Page } from '../types'

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

// GET /item_tags/?by=tag&id=N — response schema is untyped ({}); backend may return
// Item[], Page<Item>, or ItemTag[] ({item_id, tag_id}[]). Handle all three shapes.
export async function fetchItemIdsByTag(tagId: number): Promise<number[]> {
  type ItemTag = { item_id: number; tag_id: number }
  const result = await apiFetch<Item[] | Page<Item> | ItemTag[]>(`/item_tags/?by=tag&id=${tagId}`)
  if (Array.isArray(result)) {
    if (result.length === 0) return []
    const first = result[0] as Record<string, unknown>
    if ('item_id' in first) return (result as ItemTag[]).map(r => r.item_id)
    if ('id' in first) return (result as Item[]).map(i => i.id!)
    return []
  }
  if (result && typeof result === 'object' && Array.isArray((result as Page<Item>).items)) {
    return (result as Page<Item>).items.map(i => i.id!)
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
