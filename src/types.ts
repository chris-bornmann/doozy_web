export enum Priority {
  HIGH = 0,
  MEDIUM = 1,
  LOW = 2,
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.HIGH]: 'HIGH',
  [Priority.MEDIUM]: 'MEDIUM',
  [Priority.LOW]: 'LOW',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.HIGH]: 'priority-high',
  [Priority.MEDIUM]: 'priority-medium',
  [Priority.LOW]: 'priority-low',
}

export enum State {
  New = 0,
  InProgress = 1,
  Done = 2,
  Cancelled = 3,
}

export const STATE_LABELS: Record<State, string> = {
  [State.New]: 'New',
  [State.InProgress]: 'In Progress',
  [State.Done]: 'Done',
  [State.Cancelled]: 'Cancelled',
}

export const STATE_CSS: Record<State, string> = {
  [State.New]: 'state-new',
  [State.InProgress]: 'state-in-progress',
  [State.Done]: 'state-done',
  [State.Cancelled]: 'state-cancelled',
}

export type SortBy = 'priority' | 'created_on' | 'due_on' | 'state' | 'custom' | 'name'

export interface Item {
  id?: number
  name: string
  description?: string | null
  priority?: Priority | null
  state?: State | null
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
