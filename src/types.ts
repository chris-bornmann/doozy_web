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
  owner?: string | null       // username of current owner (defaults to creator)
  group_id?: number | null    // group this item is assigned to, if any
  created_on: string
  due_on?: string | null
  completed_on?: string | null
  updated_on?: string | null
}

export interface ItemRead extends Item {
  id: number           // always present in API responses
  owner: string        // always present — defaults to creator's username
  group_id: number | null  // always present — null if no group assigned
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

export interface Tag {
  id?: number | null
  name: string
}

export interface FiltersState {
  name: string
  states: Set<State>
  priorities: Set<Priority>
  createdStart: string | null
  createdEnd: string | null
  dueStart: string | null
  dueEnd: string | null
  completedStart: string | null
  completedEnd: string | null
  groupIds: number[]
}

export const EMPTY_FILTERS: FiltersState = {
  name: '',
  states: new Set(),
  priorities: new Set(),
  createdStart: null,
  createdEnd: null,
  dueStart: null,
  dueEnd: null,
  completedStart: null,
  completedEnd: null,
  groupIds: [],
}

export interface ItemFilter {
  name?: string | null
  state?: State[]
  priority?: Priority[]
  created_after?: string | null
  created_before?: string | null
  created_on?: string | null
  due_after?: string | null
  due_before?: string | null
  due_on?: string | null
  completed_after?: string | null
  completed_before?: string | null
  completed_on?: string | null
  tags?: string[]
  group_ids?: number[]
}

export type Permissions = Record<string, string[]>

export interface GroupRead {
  id: number
  name: string
  owner: string
  members: string[]
  created_on: string
}

export interface FriendshipRead {
  id: number
  requester: string
  addressee: string
  status: number  // 0=pending, 1=accepted, 2=declined
  created_on: string
  updated_on: string | null
}

export interface FriendUser {
  id: number | null  // friendship id — used for DELETE
  username: string
  full_name: string | null
}

export interface UserRolesSummary {
  user_id: number
  username: string
  roles: string[]
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}
