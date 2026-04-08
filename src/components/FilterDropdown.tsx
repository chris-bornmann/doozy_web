import { useState, useRef, useEffect } from 'react'

export interface FilterOption {
  id: number
  label: string
}

interface FilterDropdownProps {
  label: string
  options: FilterOption[]
  selected: Set<number>
  onToggle: (id: number) => void
  onClear: () => void
}

export default function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const noneSelected = selected.size === 0
  const triggerLabel = noneSelected
    ? `${label}: All`
    : `${label}: ${selected.size} selected`

  return (
    <div ref={containerRef} className="filter-dropdown">
      <button
        className={`filter-dropdown-trigger${!noneSelected ? ' filter-dropdown-trigger--active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{triggerLabel}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="filter-dropdown-menu" role="listbox" aria-multiselectable="true">
          {options.length === 0 ? (
            <p className="filter-dropdown-empty">No options available</p>
          ) : (
            <>
              <div className="filter-dropdown-list">
                {options.map(opt => {
                  const checked = selected.has(opt.id)
                  return (
                    <label key={opt.id} className="filter-dropdown-item">
                      <input
                        type="checkbox"
                        className="filter-dropdown-checkbox"
                        checked={checked}
                        onChange={() => onToggle(opt.id)}
                      />
                      <span className={`filter-dropdown-item-label${checked ? ' filter-dropdown-item-label--checked' : ''}`}>
                        {opt.label}
                      </span>
                    </label>
                  )
                })}
              </div>
              {!noneSelected && (
                <div className="filter-dropdown-footer">
                  <button
                    className="filter-dropdown-clear"
                    onClick={() => { onClear(); setOpen(false) }}
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10" height="6" viewBox="0 0 10 6" fill="none"
      style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
    >
      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
