import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item } from '../types'
import { Priority, PRIORITY_LABELS } from '../types'
import { patchItem } from '../api/items'
import { sanitizeHtml } from '../utils/sanitize'
import DatePicker from './DatePicker'
import RichTextEditor from './RichTextEditor'

interface ItemRowProps {
  item: Item
  selected: boolean
  onToggleSelect: (id: number) => void
  onUpdate: (updated: Item) => void
  sortable: boolean
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PRIORITY_CYCLE: Priority[] = [Priority.HIGH, Priority.MEDIUM, Priority.LOW]

export default function ItemRow({ item, selected, onToggleSelect, onUpdate, sortable }: ItemRowProps) {
  const id = item.id!

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const [editingField, setEditingField] = useState<null | 'name' | 'description' | 'priority' | 'due_on'>(null)
  const [nameValue, setNameValue] = useState(item.name)
  const [descValue, setDescValue] = useState(item.description ?? '')
  const [dueValue, setDueValue] = useState<string | null>(item.due_on ?? null)
  const [priorityValue, setPriorityValue] = useState<Priority | null>(item.priority ?? null)
  const [saving, setSaving] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Used to position the portal-rendered datepicker below the due-date button
  const dueBtnRef = useRef<HTMLButtonElement>(null)
  const [pickerPos, setPickerPos] = useState<{ top: number; right: number } | null>(null)

  const saveField = useCallback(
    async (field: string, value: unknown) => {
      setSaving(true)
      try {
        const patch: Partial<Pick<Item, 'name' | 'description' | 'priority' | 'due_on'>> = {}
        if (field === 'name') patch.name = value as string
        if (field === 'description') patch.description = value as string
        if (field === 'priority') patch.priority = value as Priority | null
        if (field === 'due_on') patch.due_on = value as string | null
        const updated = await patchItem(id, patch)
        onUpdate({ ...item, ...updated })
      } catch (e) {
        setNameValue(item.name)
        setDescValue(item.description ?? '')
        setDueValue(item.due_on ?? null)
        setPriorityValue(item.priority ?? null)
        console.error('Save failed:', e)
      } finally {
        setSaving(false)
        setEditingField(null)
      }
    },
    [id, item, onUpdate],
  )

  function startEditName() {
    setNameValue(item.name)
    setEditingField('name')
    setTimeout(() => nameInputRef.current?.select(), 0)
  }

  function commitName() {
    const trimmed = nameValue.trim()
    if (trimmed.length >= 8 && trimmed !== item.name) {
      saveField('name', trimmed)
    } else {
      setNameValue(item.name)
      setEditingField(null)
    }
  }

  function onNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); commitName() }
    if (e.key === 'Escape') { setNameValue(item.name); setEditingField(null) }
  }

  function startEditDesc() {
    setDescValue(item.description ?? '')
    setEditingField('description')
  }

  function commitDesc() {
    const getPlain = (h: string) => { const el = document.createElement('div'); el.innerHTML = h; return el.innerText.trim() }
    if (getPlain(descValue) !== getPlain(item.description ?? '')) {
      saveField('description', descValue)
    } else {
      setEditingField(null)
    }
  }

  function cyclePriority(e: React.MouseEvent) {
    e.stopPropagation()
    const idx = priorityValue == null ? -1 : PRIORITY_CYCLE.indexOf(priorityValue)
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]
    setPriorityValue(next)
    saveField('priority', next)
  }

  function openDueDatePicker(e: React.MouseEvent) {
    e.stopPropagation()
    if (dueBtnRef.current) {
      const rect = dueBtnRef.current.getBoundingClientRect()
      setPickerPos({
        top: rect.bottom + window.scrollY + 6,
        right: window.innerWidth - rect.right,
      })
    }
    setEditingField('due_on')
  }

  function onDueDateChange(iso: string | null) {
    setDueValue(iso)
    saveField('due_on', iso)
  }

  function closeDatePicker() {
    setEditingField(null)
    setPickerPos(null)
  }

  // Reposition picker on scroll so it tracks its anchor
  useEffect(() => {
    if (editingField !== 'due_on') return
    function reposition() {
      if (dueBtnRef.current) {
        const rect = dueBtnRef.current.getBoundingClientRect()
        setPickerPos({
          top: rect.bottom + window.scrollY + 6,
          right: window.innerWidth - rect.right,
        })
      }
    }
    window.addEventListener('scroll', reposition, { passive: true })
    return () => window.removeEventListener('scroll', reposition)
  }, [editingField])

  const priorityClass =
    priorityValue === Priority.HIGH ? 'priority-high' :
    priorityValue === Priority.MEDIUM ? 'priority-medium' :
    priorityValue === Priority.LOW ? 'priority-low' : 'priority-none'

  const priorityLabel = priorityValue != null ? PRIORITY_LABELS[priorityValue] : '—'

  const now = Date.now()
  const dueMs = dueValue ? new Date(dueValue).getTime() : null
  const isDueSoon = dueMs != null && dueMs > now && dueMs - now < 48 * 3600 * 1000
  const isOverdue = dueMs != null && dueMs < now

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'item-row',
        selected ? 'item-row--selected' : '',
        isDragging ? 'item-row--dragging' : '',
        saving ? 'item-row--saving' : '',
      ].join(' ')}
    >
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

      <div className="item-content">
        {/* Row 1: name · priority · due date */}
        <div className="item-line1">
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
            <span className="item-name" onClick={startEditName} title="Click to edit name">
              {item.name}
            </span>
          )}

          <div className="item-line1-spacer" />

          <button className={`item-priority ${priorityClass}`} onClick={cyclePriority} title="Click to cycle priority">
            {priorityLabel}
          </button>

          <button
            ref={dueBtnRef}
            className={['item-due', isOverdue ? 'item-due--overdue' : '', isDueSoon ? 'item-due--soon' : ''].join(' ')}
            onClick={openDueDatePicker}
            title="Click to change due date"
          >
            <CalendarIcon />
            {dueValue ? formatDate(dueValue) : <span className="item-due-empty">Set due date</span>}
          </button>
        </div>

        {/* Row 2: description · created date */}
        <div className="item-line2">
          {editingField === 'description' ? (
            <RichTextEditor value={descValue} onChange={setDescValue} onBlur={commitDesc} className="item-rte" />
          ) : (
            <div className="item-desc" onClick={startEditDesc} title="Click to edit description">
              {item.description ? (
                <span
                  className="item-desc-text"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }}
                />
              ) : (
                <span className="item-desc-empty">No description — click to add</span>
              )}
            </div>
          )}

          <div className="item-line2-spacer" />

          <span className="item-created">Created {formatDate(item.created_on)}</span>
        </div>
      </div>

      {/* Render the datepicker via a portal so it escapes all stacking contexts */}
      {editingField === 'due_on' && pickerPos && createPortal(
        <div
          className="item-datepicker-popover"
          style={{ top: pickerPos.top, right: pickerPos.right, position: 'absolute' }}
        >
          <DatePicker value={dueValue} onChange={onDueDateChange} onClose={closeDatePicker} />
        </div>,
        document.body,
      )}
    </div>
  )
}

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

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1" y="2" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 1v2M9 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M1 5h11" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
