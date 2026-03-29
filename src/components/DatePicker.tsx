import { useState, useRef, useEffect } from 'react'

interface DatePickerProps {
  value: string | null | undefined  // ISO date-time string
  onChange: (isoDate: string | null) => void
  onClose: () => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function DatePicker({ value, onChange, onClose }: DatePickerProps) {
  const now = new Date()
  const initial = value ? new Date(value) : null

  const [viewYear, setViewYear] = useState(initial?.getFullYear() ?? now.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial?.getMonth() ?? now.getMonth())
  const [selected, setSelected] = useState<Date | null>(initial)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function prevYear() { setViewYear(y => y - 1) }
  function nextYear() { setViewYear(y => y + 1) }

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day, 12, 0, 0)
    setSelected(d)
    onChange(d.toISOString())
    onClose()
  }

  function clearDate() {
    setSelected(null)
    onChange(null)
    onClose()
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const todayY = now.getFullYear()
  const todayM = now.getMonth()
  const todayD = now.getDate()

  const selY = selected?.getFullYear()
  const selM = selected?.getMonth()
  const selD = selected?.getDate()

  return (
    <div ref={ref} className="datepicker">
      {/* Year navigation */}
      <div className="datepicker-nav">
        <button className="datepicker-nav-btn" onClick={prevYear} title="Previous year">
          «
        </button>
        <button className="datepicker-nav-btn" onClick={prevMonth} title="Previous month">
          ‹
        </button>
        <span className="datepicker-nav-label">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button className="datepicker-nav-btn" onClick={nextMonth} title="Next month">
          ›
        </button>
        <button className="datepicker-nav-btn" onClick={nextYear} title="Next year">
          »
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="datepicker-grid">
        {DAYS.map(d => (
          <div key={d} className="datepicker-dow">{d}</div>
        ))}

        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} />
          }
          const isToday = viewYear === todayY && viewMonth === todayM && day === todayD
          const isSelected = viewYear === selY && viewMonth === selM && day === selD
          return (
            <button
              key={day}
              className={[
                'datepicker-day',
                isToday ? 'datepicker-day--today' : '',
                isSelected ? 'datepicker-day--selected' : '',
              ].join(' ')}
              onClick={() => selectDay(day)}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="datepicker-footer">
        <button className="datepicker-clear" onClick={clearDate}>
          Clear date
        </button>
        <button className="datepicker-today" onClick={() => {
          const d = new Date()
          setViewYear(d.getFullYear())
          setViewMonth(d.getMonth())
        }}>
          Today
        </button>
      </div>
    </div>
  )
}
