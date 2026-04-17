import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item, ItemRead, GroupRead, FriendUser } from '../types'
import { Priority, State, STATE_LABELS, STATE_CSS } from '../types'
import { patchItem } from '../api/items'
import DatePicker from './DatePicker'
import ItemDetailModal from './ItemDetailModal'

interface ItemRowProps {
  item: ItemRead
  selected: boolean
  onToggleSelect: (id: number) => void
  onUpdate: (updated: ItemRead) => void
  onRemove: (id: number) => void
  sortable: boolean
  myGroups?: GroupRead[]
  myFriends?: FriendUser[]
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PRIORITY_CYCLE: Priority[] = [Priority.LOW, Priority.MEDIUM, Priority.HIGH]
const ALL_STATES: State[] = [State.New, State.InProgress, State.Done, State.Cancelled]

type EditingField = null | 'name' | 'priority' | 'due_on' | 'state'

export default function ItemRow({ item, selected, onToggleSelect, onUpdate, onRemove, sortable, myGroups, myFriends }: ItemRowProps) {
  const id = item.id!

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const [showDetail, setShowDetail] = useState(false)
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [nameValue, setNameValue] = useState(item.name)
  const [, setDescValue] = useState(item.description ?? '')
  const [dueValue, setDueValue] = useState<string | null>(item.due_on ?? null)
  const [priorityValue, setPriorityValue] = useState<Priority | null>(item.priority ?? null)
  const [stateValue, setStateValue] = useState<State>(item.state ?? State.New)
  const [saving, setSaving] = useState(false)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const dueBtnRef = useRef<HTMLButtonElement>(null)
  const stateBtnRef = useRef<HTMLButtonElement>(null)
  const [pickerPos, setPickerPos] = useState<{ top: number; right: number } | null>(null)
  const [stateDropPos, setStateDropPos] = useState<{ top: number; left: number } | null>(null)

  const saveField = useCallback(
    async (field: string, value: unknown) => {
      setSaving(true)
      try {
        const patch: Partial<Pick<Item, 'name' | 'description' | 'priority' | 'due_on' | 'state'>> = {}
        if (field === 'name') patch.name = value as string
        if (field === 'description') patch.description = value as string
        if (field === 'priority') patch.priority = value as Priority | null
        if (field === 'due_on') patch.due_on = value as string | null
        if (field === 'state') patch.state = value as State
        const updated = await patchItem(id, patch)
        onUpdate({ ...item, ...updated })
      } catch (e) {
        setNameValue(item.name)
        setDescValue(item.description ?? '')
        setDueValue(item.due_on ?? null)
        setPriorityValue(item.priority ?? null)
        setStateValue(item.state ?? State.New)
        console.error('Save failed:', e)
      } finally {
        setSaving(false)
        setEditingField(null)
      }
    },
    [id, item, onUpdate],
  )

  // ── Name ──────────────────────────────────────────────────────────────────
  function startEditName() {
    setNameValue(item.name)
    setEditingField('name')
    setTimeout(() => nameInputRef.current?.select(), 0)
  }
  function commitName() {
    const trimmed = nameValue.trim()
    if (trimmed.length >= 8 && trimmed !== item.name) saveField('name', trimmed)
    else { setNameValue(item.name); setEditingField(null) }
  }
  function onNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); commitName() }
    if (e.key === 'Escape') { setNameValue(item.name); setEditingField(null) }
  }

  // ── Priority ──────────────────────────────────────────────────────────────
  function cyclePriority(e: React.MouseEvent) {
    e.stopPropagation()
    const idx = priorityValue == null ? -1 : PRIORITY_CYCLE.indexOf(priorityValue)
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]
    setPriorityValue(next)
    saveField('priority', next)
  }

  // ── Due date ──────────────────────────────────────────────────────────────
  function openDueDatePicker(e: React.MouseEvent) {
    e.stopPropagation()
    if (dueBtnRef.current) {
      const rect = dueBtnRef.current.getBoundingClientRect()
      setPickerPos({ top: rect.bottom + window.scrollY + 6, right: window.innerWidth - rect.right })
    }
    setEditingField('due_on')
  }
  function onDueDateChange(iso: string | null) { setDueValue(iso); saveField('due_on', iso) }
  function closeDatePicker() { setEditingField(null); setPickerPos(null) }

  useEffect(() => {
    if (editingField !== 'due_on') return
    function reposition() {
      if (dueBtnRef.current) {
        const rect = dueBtnRef.current.getBoundingClientRect()
        setPickerPos({ top: rect.bottom + window.scrollY + 6, right: window.innerWidth - rect.right })
      }
    }
    window.addEventListener('scroll', reposition, { passive: true })
    return () => window.removeEventListener('scroll', reposition)
  }, [editingField])

  // ── State ─────────────────────────────────────────────────────────────────
  function openStateDropdown(e: React.MouseEvent) {
    e.stopPropagation()
    if (stateBtnRef.current) {
      const rect = stateBtnRef.current.getBoundingClientRect()
      setStateDropPos({ top: rect.bottom + window.scrollY + 6, left: rect.left })
    }
    setEditingField('state')
  }
  function selectState(s: State) {
    setStateValue(s)
    saveField('state', s)
  }
  function closeStateDropdown() { setEditingField(null); setStateDropPos(null) }

  useEffect(() => {
    if (editingField !== 'state') return
    function reposition() {
      if (stateBtnRef.current) {
        const rect = stateBtnRef.current.getBoundingClientRect()
        setStateDropPos({ top: rect.bottom + window.scrollY + 6, left: rect.left })
      }
    }
    window.addEventListener('scroll', reposition, { passive: true })
    return () => window.removeEventListener('scroll', reposition)
  }, [editingField])

  // ── Derived display values ────────────────────────────────────────────────
  const now = Date.now()
  const dueMs = dueValue ? new Date(dueValue).getTime() : null
  const isActive = stateValue !== State.Cancelled && stateValue !== State.Done
  const isDueSoon = isActive && dueMs != null && dueMs > now && dueMs - now < 3 * 24 * 3600 * 1000
  const isOverdue = isActive && dueMs != null && dueMs < now

  const isCancelled = stateValue === State.Cancelled

  const statePillClass =
    stateValue === State.New ? 'state-pill--new' :
    stateValue === State.InProgress ? 'state-pill--in-progress' :
    stateValue === State.Done ? 'state-pill--done' : 'state-pill--cancelled'

  const priorityBadgeClass =
    priorityValue === Priority.HIGH ? 'priority-badge--high' :
    priorityValue === Priority.MEDIUM ? 'priority-badge--medium' :
    priorityValue === Priority.LOW ? 'priority-badge--low' : 'priority-badge--none'

  const priorityBadgeLabel =
    priorityValue === Priority.HIGH ? 'High' :
    priorityValue === Priority.MEDIUM ? 'Medium' :
    priorityValue === Priority.LOW ? 'Low' : '—'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'item-row',
        selected ? 'item-row--selected' : '',
        isDragging ? 'item-row--dragging' : '',
        saving ? 'item-row--saving' : '',
        isCancelled ? 'item-row--cancelled' : '',
        isOverdue ? 'item-row--overdue' : '',
        isDueSoon ? 'item-row--due-soon' : '',
      ].join(' ')}
    >
      {/* Cell 1: Checkbox (drag handle overlaid when sortable) */}
      <div className="item-checkbox-cell" style={{ position: 'relative' }}>
        {sortable && (
          <button className="item-drag-handle" {...attributes} {...listeners} tabIndex={-1} aria-label="Drag to reorder">
            <DragIcon />
          </button>
        )}
        <button className="item-checkbox" onClick={() => onToggleSelect(id)} aria-label={selected ? 'Deselect' : 'Select'}>
          <div className={`item-checkbox-box ${selected ? 'item-checkbox-box--checked' : ''}`}>
            {selected && <CheckIcon />}
          </div>
        </button>
      </div>

      {/* Cell 2: Work — ID + name */}
      <div className="item-work-cell">
        {editingField === 'name' ? (
          <input
            ref={nameInputRef}
            className="item-name-input"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={onNameKeyDown}
            minLength={8}
            maxLength={32}
          />
        ) : (
          <span
            className={`item-name ${isCancelled ? 'item-name--cancelled' : ''}`}
            onClick={startEditName}
            title="Click to edit name"
          >
            {item.name}
          </span>
        )}
      </div>

      {/* Cell 3: Owner */}
      <div className="item-owner-cell">
        {item.owner ? (
          <>
            <span className="item-owner-avatar" style={{ background: avatarColor(item.owner) }}>
              {initials(item.owner)}
            </span>
            <span className="item-owner-name">{item.owner}</span>
          </>
        ) : (
          <span className="item-owner-name" style={{ color: 'var(--text-3)' }}>—</span>
        )}
      </div>

      {/* Cell 4: Priority */}
      <div className="item-priority-cell">
        <button className={`priority-badge ${priorityBadgeClass}`} onClick={cyclePriority} title="Click to cycle priority">
          <PriorityIcon priority={priorityValue} />
          {priorityBadgeLabel}
        </button>
      </div>

      {/* Cell 5: Status */}
      <div className="item-status-cell">
        <button
          ref={stateBtnRef}
          className={`state-pill ${statePillClass}`}
          onClick={openStateDropdown}
          title="Click to change status"
        >
          <StateIcon state={stateValue} />
          {STATE_LABELS[stateValue]}
        </button>
      </div>

      {/* Cell 6: Due date */}
      <div className="item-due-cell">
        <button
          ref={dueBtnRef}
          className={['item-due', isOverdue ? 'item-due--overdue' : '', isDueSoon ? 'item-due--soon' : ''].join(' ')}
          onClick={openDueDatePicker}
          title="Click to set due date"
        >
          {dueValue ? formatDate(dueValue) : <span className="item-due-empty">—</span>}
        </button>
      </div>

      {/* Cell 7: Created */}
      <div className="item-created-cell">{formatDate(item.created_on)}</div>

      {/* Cell 8: Actions */}
      <div className="item-actions-cell">
        <button
          className="item-expand-btn"
          onClick={() => setShowDetail(true)}
          aria-label="Open detail view"
          title="Open detail"
        >
          <ExpandIcon />
        </button>
      </div>

      {/* Datepicker portal */}
      {editingField === 'due_on' && pickerPos && createPortal(
        <div className="item-datepicker-popover" style={{ top: pickerPos.top, right: pickerPos.right, position: 'absolute' }}>
          <DatePicker value={dueValue} onChange={onDueDateChange} onClose={closeDatePicker} />
        </div>,
        document.body,
      )}

      {/* State dropdown portal */}
      {editingField === 'state' && stateDropPos && createPortal(
        <StateDropdown
          current={stateValue}
          pos={stateDropPos}
          onSelect={selectState}
          onClose={closeStateDropdown}
        />,
        document.body,
      )}

      {/* Item detail modal */}
      {showDetail && (
        <ItemDetailModal
          item={item}
          myGroups={myGroups}
          myFriends={myFriends}
          onRemove={() => onRemove(id)}
          onUpdate={updated => {
            onUpdate(updated)
            setNameValue(updated.name)
            setDescValue(updated.description ?? '')
            setPriorityValue(updated.priority ?? null)
            setStateValue(updated.state ?? State.New)
            setDueValue(updated.due_on ?? null)
          }}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  )
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#4285F4', '#DB4437', '#F4B400', '#0F9D58']
function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0x7fffffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
function initials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

// ── Priority icon ─────────────────────────────────────────────────────────────
function PriorityIcon({ priority }: { priority: Priority | null }) {
  if (priority === Priority.HIGH) return <span style={{ fontSize: 11 }}>▲</span>
  if (priority === Priority.MEDIUM) return <span style={{ fontSize: 11, letterSpacing: '-1px' }}>＝</span>
  if (priority === Priority.LOW) return <span style={{ fontSize: 11 }}>▼</span>
  return null
}

// ── State dropdown ────────────────────────────────────────────────────────────
function StateDropdown({
  current, pos, onSelect, onClose,
}: {
  current: State
  pos: { top: number; left: number }
  onSelect: (s: State) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="state-dropdown"
      style={{ top: pos.top, left: pos.left, position: 'absolute' }}
    >
      {ALL_STATES.map(s => (
        <button
          key={s}
          className={`state-dropdown-item ${STATE_CSS[s]} ${s === current ? 'state-dropdown-item--active' : ''}`}
          onClick={() => onSelect(s)}
        >
          <StateIcon state={s} />
          {STATE_LABELS[s]}
          {s === current && <span className="state-dropdown-check">✓</span>}
        </button>
      ))}
    </div>
  )
}

// ── State icon ────────────────────────────────────────────────────────────────
function StateIcon({ state }: { state: State }) {
  if (state === State.New) return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
  if (state === State.InProgress) return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 5L7.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
  if (state === State.Done) return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 5l1.5 1.5L7 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  // Cancelled
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 3.5l3 3M6.5 3.5l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Other icons ───────────────────────────────────────────────────────────────
function DragIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="4" r="1.4" fill="currentColor" />
      <circle cx="11" cy="4" r="1.4" fill="currentColor" />
      <circle cx="5" cy="8" r="1.4" fill="currentColor" />
      <circle cx="11" cy="8" r="1.4" fill="currentColor" />
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="11" cy="12" r="1.4" fill="currentColor" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 3.5L4 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ExpandIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M1 4V1h3M7 1h3v3M10 7v3H7M4 10H1V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
