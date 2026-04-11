import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { fetchUserRoles, addUserRole, removeUserRole } from '../api/rbac'
import type { UserRolesSummary } from '../types'

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default function RbacPage() {
  const { user, logout, can } = useAuth()
  const canWrite = can('rbac', 'write')
  const canDelete = can('rbac', 'delete')
  const [users, setUsers] = useState<UserRolesSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newRoles, setNewRoles] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  async function load() {
    try {
      setError(null)
      const data = await fetchUserRoles()
      setUsers(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(userId: number) {
    const role = (newRoles[userId] ?? '').trim()
    if (!role) return
    const key = `add-${userId}-${role}`
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await addUserRole(userId, role)
      setNewRoles(r => ({ ...r, [userId]: '' }))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add role')
    } finally {
      setSaving(s => { const n = { ...s }; delete n[key]; return n })
    }
  }

  async function handleRemove(userId: number, role: string) {
    const key = `remove-${userId}-${role}`
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await removeUserRole(userId, role)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove role')
    } finally {
      setSaving(s => { const n = { ...s }; delete n[key]; return n })
    }
  }

  return (
    <div className="items-page">
      <header className="items-header">
        <div className="items-header-brand">
          <h1 className="items-brand-name">Doozy</h1>
          <span className="items-brand-sep">·</span>
          <span className="items-brand-user">{user?.username}</span>
        </div>

        <div className="items-header-actions">
          <Link to="/items" className="btn-ghost btn-sm">Items</Link>
          <Link to="/friends" className="btn-ghost btn-sm">Friends</Link>
          <button className="btn-ghost btn-sm" onClick={logout} title="Sign out">
            <SignOutIcon />
          </button>
        </div>
      </header>

      <div style={{ padding: '32px 48px', maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-100)', marginBottom: 24 }}>
          Role Management
        </h2>

        {error && (
          <div style={{ color: 'var(--crimson)', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-ink-400 font-mono text-sm animate-pulse">LOADING…</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ink-800)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: 'var(--ink-400)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>User</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: 'var(--ink-400)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Roles</th>
                {canWrite && <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: 'var(--ink-400)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Add Role</th>}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id} style={{ borderBottom: '1px solid var(--ink-900)' }}>
                  <td style={{ padding: '12px', fontSize: 14, color: 'var(--ink-200)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {u.username}
                  </td>
                  <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                    <div className="tag-pills">
                      {u.roles.length === 0 && (
                        <span className="tag-pills-empty">No roles</span>
                      )}
                      {u.roles.map(role => (
                        <span key={role} className="tag-pill">
                          {role}
                          {canDelete && (
                            <button
                              className="tag-pill-remove"
                              title={`Remove ${role}`}
                              disabled={saving[`remove-${u.user_id}-${role}`]}
                              onClick={() => handleRemove(u.user_id, role)}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  {canWrite && <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        className="field-input"
                        style={{ width: 160 }}
                        type="text"
                        placeholder="role name"
                        value={newRoles[u.user_id] ?? ''}
                        onChange={e => setNewRoles(r => ({ ...r, [u.user_id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(u.user_id) }}
                      />
                      <button
                        className="btn-primary btn-sm"
                        disabled={!newRoles[u.user_id]?.trim() || Object.keys(saving).some(k => k.startsWith(`add-${u.user_id}`))}
                        onClick={() => handleAdd(u.user_id)}
                      >
                        Add
                      </button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
