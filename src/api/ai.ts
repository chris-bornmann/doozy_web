import { apiFetch } from './client'
import type { ItemFilter } from '../types'

export interface AiResponse {
  operation?: string | null
  item_id?: number | null
  fields?: Record<string, unknown> | null
  filter?: ItemFilter | null
  error?: string | null
  [key: string]: unknown
}

export async function postAiRequest(text: string): Promise<AiResponse> {
  return apiFetch<AiResponse>('/ai/request', {
    method: 'POST',
    body: JSON.stringify({ request: text }),
  })
}
