export enum Priority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: 'LOW',
  [Priority.MEDIUM]: 'MEDIUM',
  [Priority.HIGH]: 'HIGH',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.LOW]: 'priority-low',
  [Priority.MEDIUM]: 'priority-medium',
  [Priority.HIGH]: 'priority-high',
}

export type SortBy = 'priority' | 'created_on' | 'due_on' | 'custom' | 'name'

export interface Item {
  id?: number
  name: string
  description?: string | null
  priority?: Priority | null
  creator_id: number
  created_on: string
  due_on?: string | null
  completed_on?: string | null
  updated_on?: string | null
}

export interface Token {
  access_token: string
  token_type: string
}

export interface User {
  id?: number
  username: string
  enabled: boolean
  full_name?: string | null
  created_on: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}
