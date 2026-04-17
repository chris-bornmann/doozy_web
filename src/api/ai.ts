import { apiFetch, getToken } from './client'
import { API_BASE_URL } from '../config'
import type { ItemFilter } from '../types'

export interface AiResponse {
  operation?: string | null
  item_id?: number | null
  fields?: Record<string, unknown> | null
  filter?: ItemFilter | null
  error?: string | null
  transcript?: string | null
  [key: string]: unknown
}

export async function postAiRequest(text: string): Promise<AiResponse> {
  return apiFetch<AiResponse>('/ai/request', {
    method: 'POST',
    body: JSON.stringify({ request: text }),
  })
}

export async function postAiVoiceRequest(audio: Blob): Promise<AiResponse> {
  const token = getToken()
  const form = new FormData()
  form.append('audio', audio, audio.type.includes('mp4') ? 'recording.m4a' : 'recording.webm')
  const resp = await fetch(`${API_BASE_URL}/ai/voice`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!resp.ok) {
    let message = `HTTP ${resp.status}`
    try { message = ((await resp.json()) as { detail?: string }).detail ?? message } catch { /**/ }
    throw new Error(message)
  }
  const text = await resp.text()
  return text ? (JSON.parse(text) as AiResponse) : ({} as AiResponse)
}
