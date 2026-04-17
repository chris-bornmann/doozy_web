import { useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth'
import NavMenu from '../components/NavMenu'
import { fetchGroups, createGroup, deleteGroup } from '../api/groups'
import { fetchFriends } from '../api/friends'
import type { GroupRead } from '../types'
import GroupMembersModal from '../components/GroupMembersModal'

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: 12,
  color: 'var(--ink-400)',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const td: React.CSSProperties = {
  padding: '12px',
  fontSize: 14,
  color: 'var(--ink-200)',
  verticalAlign: 'middle',
}

export default function GroupsPage() {
  const { user, logout } = useAuth()

  const [groups, setGroups] = useState<GroupRead[]>([])
  const [friends, setFriends] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Per-row deleting state
  const [deleting, setDeleting] = useState<Record<number, boolean>>({})

  // Modal
  const [managingGroup, setManagingGroup] = useState<GroupRead | null>(null)

  async function load() {
    try {
      setError(null)
      const [g, f] = await Promise.all([fetchGroups(), fetchFriends()])
      setGroups(g)
      setFriends(f.map(fr => fr.username))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setCreateError(null)
    try {
      const group = await createGroup(name)
      setNewName('')
      setGroups(prev => [group, ...prev])
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: number) {
    setDeleting(d => ({ ...d, [id]: true }))
    try {
      await deleteGroup(id)
      setGroups(prev => prev.filter(g => g.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete group')
    } finally {
      setDeleting(d => { const n = { ...d }; delete n[id]; return n })
    }
  }

  function handleGroupUpdate(updated: GroupRead) {
    setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
    if (managingGroup?.id === updated.id) setManagingGroup(updated)
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
          <NavMenu />
          <button className="btn-ghost btn-sm" onClick={logout} title="Sign out">
            <SignOutIcon />
          </button>
        </div>
      </header>

      <div style={{ padding: '32px 48px', maxWidth: 960, margin: '0 auto' }}>

        {error && (
          <div style={{ color: 'var(--crimson)', fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {/* ── Create group ───────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-100)', marginBottom: 12 }}>
            Create Group
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="field-input"
              style={{ width: 260 }}
              type="text"
              placeholder="group name"
              value={newName}
              onChange={e => { setNewName(e.target.value); setCreateError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            />
            <button
              className="btn-ghost btn-sm"
              disabled={!newName.trim() || creating}
              onClick={handleCreate}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
          {createError && <p style={{ fontSize: 13, color: 'var(--crimson)', marginTop: 8 }}>{createError}</p>}
        </section>

        {/* ── Groups list ────────────────────────────────────────── */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-100)', marginBottom: 12 }}>
            {loading ? 'Groups' : `Groups (${groups.length})`}
          </h2>

          {loading ? (
            <p className="text-ink-400 font-mono text-sm animate-pulse">LOADING…</p>
          ) : groups.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--ink-500)' }}>No groups yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ink-800)' }}>
                  <th style={th}>Name</th>
                  <th style={th}>Owner</th>
                  <th style={th}>Members</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <tr key={group.id} style={{ borderBottom: '1px solid var(--ink-900)' }}>
                    <td style={td}>{group.name}</td>
                    <td style={{ ...td, color: 'var(--ink-400)' }}>{group.owner}</td>
                    <td style={{ ...td, color: 'var(--ink-400)' }}>
                      {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                    </td>
                    <td style={{ ...td, display: 'flex', gap: 8 }}>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => setManagingGroup(group)}
                      >
                        Manage
                      </button>
                      {user?.username === group.owner && (
                        <button
                          className="btn-ghost btn-sm"
                          disabled={!!deleting[group.id]}
                          onClick={() => handleDelete(group.id)}
                        >
                          {deleting[group.id] ? 'Deleting…' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {managingGroup && (
        <GroupMembersModal
          group={managingGroup}
          friends={friends}
          onUpdate={handleGroupUpdate}
          onClose={() => setManagingGroup(null)}
        />
      )}
    </div>
  )
}
