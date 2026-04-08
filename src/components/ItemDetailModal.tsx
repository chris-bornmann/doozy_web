import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { patchItem } from '../api/items'
import { Priority, PRIORITY_LABELS, State, STATE_LABELS, STATE_CSS } from '../types'
import type { Item } from '../types'
import RichTextEditor from './RichTextEditor'
import DatePicker from './DatePicker'

interface ItemDetailModalProps {
  item: Item
  onUpdate: (updated: Item) => void
  onClose: () => void
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ItemDetailModal({ item, onUpdate, onClose }: ItemDetailModalProps) {
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description ?? '')
  const [priority, setPriority] = useState<Priority | null>(item.priority ?? null)
  const [state, setState] = useState<State>(item.state ?? State.New)
  const [dueOn, setDueOn] = useState<string | null>(item.due_on ?? null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleOk() {
    const trimmed = name.trim()
    if (trimmed.length < 8) { setError('Name must be at least 8 characters.'); return }
    if (trimmed.length > 32) { setError('Name must be 32 characters or fewer.'); return }

    const patch: Partial<Pick<Item, 'name' | 'description' | 'priority' | 'state' | 'due_on'>> = {}
    if (trimmed !== item.name) patch.name = trimmed
    if (description !== (item.description ?? '')) patch.description = description
    if (priority !== (item.priority ?? null)) patch.priority = priority
    if (state !== (item.state ?? State.New)) patch.state = state
    if (dueOn !== (item.due_on ?? null)) patch.due_on = dueOn

    if (Object.keys(patch).length === 0) { onClose(); return }

    setError('')
    setSaving(true)
    try {
      const updated = await patchItem(item.id!, patch)
      onUpdate({ ...item, ...updated })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal detail-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        <div className="modal-header">
          <h2 id="detail-modal-title" className="modal-title">Edit Item</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-form">
          {/* Name */}
          <div className="modal-field">
            <label className="modal-label" htmlFor="detail-name">
              Name <span className="modal-required">*</span>
            </label>
            <input
              id="detail-name"
              ref={nameRef}
              className="field-input"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              minLength={8}
              maxLength={32}
            />
            <span className="modal-char-count">{name.length}/32</span>
          </div>

          {/* Description */}
          <div className="modal-field">
            <label className="modal-label">Description</label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Optional description…"
              maxLength={128}
            />
          </div>

          <div className="modal-row">
            {/* Priority */}
            <div className="modal-field modal-field--half">
              <label className="modal-label">Priority</label>
              <div className="modal-priority-group">
                {([Priority.HIGH, Priority.MEDIUM, Priority.LOW] as Priority[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    className={[
                      'modal-priority-btn',
                      priority === p ? 'modal-priority-btn--active' : '',
                      p === Priority.HIGH ? 'priority-high' :
                      p === Priority.MEDIUM ? 'priority-medium' : 'priority-low',
                    ].join(' ')}
                    onClick={() => setPriority(prev => prev === p ? null : p)}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* State */}
            <div className="modal-field modal-field--half">
              <label className="modal-label">State</label>
              <div className="modal-state-group">
                {([State.New, State.InProgress, State.Done, State.Cancelled] as State[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    className={[
                      'modal-state-btn',
                      STATE_CSS[s],
                      state === s ? 'modal-state-btn--active' : '',
                    ].join(' ')}
                    onClick={() => setState(s)}
                  >
                    {STATE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Due date */}
          <div className="modal-field">
            <label className="modal-label">Due Date</label>
            <div className="modal-due-wrapper">
              <button
                type="button"
                className="modal-due-btn"
                onClick={() => setShowDatePicker(v => !v)}
              >
                <CalendarIcon />
                {dueOn ? formatDate(dueOn) : <span className="item-due-empty">Pick a date</span>}
                {dueOn && (
                  <span
                    className="modal-due-clear"
                    onClick={e => { e.stopPropagation(); setDueOn(null); setShowDatePicker(false) }}
                    title="Clear date"
                  >
                    ✕
                  </span>
                )}
              </button>
              {showDatePicker && (
                <div className="item-datepicker-popover item-datepicker-popover--modal">
                  <DatePicker
                    value={dueOn}
                    onChange={d => { setDueOn(d); setShowDatePicker(false) }}
                    onClose={() => setShowDatePicker(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Read-only created date */}
          <div className="modal-field">
            <label className="modal-label">Created</label>
            <p className="modal-readonly">{formatDate(item.created_on)}</p>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleOk} disabled={saving}>
              {saving ? (
                <span className="btn-loading"><span className="btn-spinner" />Saving…</span>
              ) : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2.5" width="12" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M1 6h12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
