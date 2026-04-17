import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Priority, PRIORITY_LABELS, State, STATE_LABELS, STATE_CSS } from '../types'
import type { FiltersState } from '../types'
import DatePicker from './DatePicker'

interface FiltersModalProps {
  initial: FiltersState
  onApply: (f: FiltersState) => void
  onClose: () => void
}

type DateField = 'createdStart' | 'createdEnd' | 'dueStart' | 'dueEnd' | 'completedStart' | 'completedEnd'

function formatDate(iso: string | null): string {
  if (!iso) return 'Any'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const ALL_STATES: State[] = [State.New, State.InProgress, State.Done, State.Cancelled]
const ALL_PRIORITIES: Priority[] = [Priority.LOW, Priority.MEDIUM, Priority.HIGH]

export default function FiltersModal({ initial, onApply, onClose }: FiltersModalProps) {
  const [name, setName] = useState(initial.name)
  const [states, setStates] = useState(new Set(initial.states))
  const [priorities, setPriorities] = useState(new Set(initial.priorities))
  const [createdStart, setCreatedStart] = useState(initial.createdStart)
  const [createdEnd, setCreatedEnd] = useState(initial.createdEnd)
  const [dueStart, setDueStart] = useState(initial.dueStart)
  const [dueEnd, setDueEnd] = useState(initial.dueEnd)
  const [completedStart, setCompletedStart] = useState(initial.completedStart)
  const [completedEnd, setCompletedEnd] = useState(initial.completedEnd)
  const [openPicker, setOpenPicker] = useState<DateField | null>(null)

  useEffect(() => {
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

  function toggleState(s: State) {
    setStates(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })
  }

  function togglePriority(p: Priority) {
    setPriorities(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p); else next.add(p)
      return next
    })
  }

  function setDateField(field: DateField, value: string | null) {
    switch (field) {
      case 'createdStart':   setCreatedStart(value);   break
      case 'createdEnd':     setCreatedEnd(value);     break
      case 'dueStart':       setDueStart(value);       break
      case 'dueEnd':         setDueEnd(value);         break
      case 'completedStart': setCompletedStart(value); break
      case 'completedEnd':   setCompletedEnd(value);   break
    }
  }

  function handleDatePick(field: DateField, value: string | null) {
    setDateField(field, value)
    setOpenPicker(null)
  }

  function handleClearAll() {
    setName('')
    setStates(new Set())
    setPriorities(new Set())
    setCreatedStart(null); setCreatedEnd(null)
    setDueStart(null); setDueEnd(null)
    setCompletedStart(null); setCompletedEnd(null)
    setOpenPicker(null)
  }

  function handleApply() {
    onApply({ name, states, priorities, createdStart, createdEnd, dueStart, dueEnd, completedStart, completedEnd, groupIds: [] })
  }

  function togglePicker(field: DateField) {
    setOpenPicker(prev => prev === field ? null : field)
  }

  const datePickerFor = (field: DateField, value: string | null) => (
    openPicker === field ? (
      <div className="filters-datepicker">
        <DatePicker
          value={value}
          onChange={v => handleDatePick(field, v)}
          onClose={() => setOpenPicker(null)}
        />
      </div>
    ) : null
  )

  const dateBtnFor = (field: DateField, label: string, value: string | null) => (
    <div className="modal-due-wrapper">
      <button
        type="button"
        className={`modal-due-btn${openPicker === field ? ' modal-due-btn--open' : ''}`}
        onClick={() => togglePicker(field)}
      >
        <CalendarIcon />
        {label}: {formatDate(value)}
      </button>
      {datePickerFor(field, value)}
    </div>
  )

  const modal = (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal filters-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-modal-title"
      >
        <div className="modal-header">
          <h2 id="filters-modal-title" className="modal-title">Filters</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-form">
          {/* State */}
          <div className="modal-field">
            <label className="modal-label">State</label>
            <div className="modal-state-group">
              {ALL_STATES.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`modal-state-btn ${STATE_CSS[s]} ${states.has(s) ? 'modal-state-btn--active' : ''}`}
                  onClick={() => toggleState(s)}
                >
                  {STATE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="modal-field">
            <label className="modal-label">Priority</label>
            <div className="modal-priority-group">
              {ALL_PRIORITIES.map(p => (
                <button
                  key={p}
                  type="button"
                  className={[
                    'modal-priority-btn',
                    priorities.has(p) ? 'modal-priority-btn--active' : '',
                    p === Priority.HIGH ? 'priority-high' :
                    p === Priority.MEDIUM ? 'priority-medium' : 'priority-low',
                  ].join(' ')}
                  onClick={() => togglePriority(p)}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="modal-field">
            <label className="modal-label" htmlFor="filters-name">Name contains</label>
            <input
              id="filters-name"
              type="text"
              className="field-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Substring match…"
            />
          </div>

          {/* Created On range */}
          <div className="modal-field">
            <label className="modal-label">Created On</label>
            <div className="filters-date-range">
              {dateBtnFor('createdStart', 'From', createdStart)}
              <span className="filters-date-sep">→</span>
              {dateBtnFor('createdEnd', 'To', createdEnd)}
            </div>
          </div>

          {/* Due On range */}
          <div className="modal-field">
            <label className="modal-label">Due On</label>
            <div className="filters-date-range">
              {dateBtnFor('dueStart', 'From', dueStart)}
              <span className="filters-date-sep">→</span>
              {dateBtnFor('dueEnd', 'To', dueEnd)}
            </div>
          </div>

          {/* Completed On range */}
          <div className="modal-field">
            <label className="modal-label">Completed On</label>
            <div className="filters-date-range">
              {dateBtnFor('completedStart', 'From', completedStart)}
              <span className="filters-date-sep">→</span>
              {dateBtnFor('completedEnd', 'To', completedEnd)}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-danger btn-sm" onClick={handleClearAll}>
              Clear All
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleApply}>Apply</button>
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
