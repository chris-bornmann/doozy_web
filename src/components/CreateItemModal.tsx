import { useState, useEffect, useRef, FormEvent } from 'react'
import { createItem } from '../api/items'
import { Priority, PRIORITY_LABELS } from '../types'
import RichTextEditor from './RichTextEditor'
import DatePicker from './DatePicker'

interface CreateItemModalProps {
  onCreated: () => void
  onClose: () => void
}

// Extract plain text from rich-text HTML (used to build the API description param)
function htmlToPlainText(html: string): string {
  const el = document.createElement('div')
  el.textContent = html  // safely set as text — we then read innerText of the raw HTML via an alternative path
  // Actually parse the HTML in a sandboxed element to extract inner text
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return doc.body.innerText.trim()
}

export default function CreateItemModal({ onCreated, onClose }: CreateItemModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority | null>(null)
  const [dueOn, setDueOn] = useState<string | null>(null)
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 8) { setError('Name must be at least 8 characters.'); return }
    if (trimmed.length > 32) { setError('Name must be 32 characters or fewer.'); return }
    setError('')
    setSaving(true)
    try {
      const plainDesc = htmlToPlainText(description) || null
      await createItem(trimmed, plainDesc, priority, dueOn)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    } finally {
      setSaving(false)
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">New Item</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-field">
            <label className="modal-label" htmlFor="create-name">
              Name <span className="modal-required">*</span>
            </label>
            <input
              id="create-name"
              ref={nameRef}
              className="field-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Minimum 8 characters…"
              minLength={8}
              maxLength={32}
              required
            />
            <span className="modal-char-count">{name.length}/32</span>
          </div>

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

            <div className="modal-field modal-field--half">
              <label className="modal-label">Due Date</label>
              <div className="modal-due-wrapper">
                <button
                  type="button"
                  className="modal-due-btn"
                  onClick={() => setShowDatePicker(v => !v)}
                >
                  <CalendarIcon />
                  {dueOn ? formatDate(dueOn) : <span className="item-due-empty">Pick a date</span>}
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
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <span className="btn-loading"><span className="btn-spinner" />Creating…</span>
              ) : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
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
