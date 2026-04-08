import { apiFetch } from './client'

export interface AiResponse {
  operation?: string | null
  item_id?: number | null
  fields?: Record<string, unknown> | null
  error?: string | null
  [key: string]: unknown
}

export async function postAiRequest(text: string): Promise<AiResponse> {
  return apiFetch<AiResponse>('/ai/request', {
    method: 'POST',
    body: JSON.stringify({ request: text }),
  })
}
