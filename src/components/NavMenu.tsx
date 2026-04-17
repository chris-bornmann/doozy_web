import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

export default function NavMenu() {
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const canViewRoles = can('rbac', 'read') || can('rbac', 'write') || can('rbac', 'delete')

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const navLinks: { to: string; label: string }[] = [
    { to: '/items', label: 'Items' },
    { to: '/friends', label: 'Friends' },
    { to: '/groups', label: 'Groups' },
    ...(canViewRoles ? [{ to: '/rbac', label: 'Roles' }] : []),
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn-ghost btn-sm"
        onClick={() => setOpen(o => !o)}
        title="Menu"
        aria-expanded={open}
      >
        <HamburgerIcon />
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          background: 'var(--ink-800)',
          border: '1px solid var(--ink-700)',
          borderRadius: 'var(--radius)',
          padding: '4px',
          minWidth: 140,
          zIndex: 100,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="btn-ghost btn-sm"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                borderRadius: 'var(--radius)',
                ...(location.pathname === to ? { color: 'var(--amber-light)', background: 'var(--ink-700)' } : {}),
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
