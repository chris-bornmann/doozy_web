import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import {
  fetchPendingRequests,
  fetchFriends,
  fetchSentRequests,
  requestFriendship,
  acceptFriendship,
  declineFriendship,
  removeFriendship,
} from '../api/friends'
import type { FriendshipRead, FriendUser } from '../types'

type FriendRow =
  | { kind: 'friend'; id: number | null; username: string; full_name: string | null }
  | { kind: 'sent';   id: number;        username: string }

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

export default function FriendsPage() {
  const { user, logout } = useAuth()

  const [pending, setPending] = useState<FriendshipRead[]>([])
  const [rows, setRows] = useState<FriendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite form
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Per-action saving state
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  // Selection for bulk delete
  const [selected, setSelected] = useState<Set<number>>(new Set())

  function buildRows(friends: FriendUser[], sent: FriendshipRead[]): FriendRow[] {
    const friendRows: FriendRow[] = friends.map(f => ({
      kind: 'friend',
      id: f.id,
      username: f.username,
      full_name: f.full_name,
    }))
    const sentRows: FriendRow[] = sent.filter(s => s.status === 0).map(s => ({
      kind: 'sent',
      id: s.id,
      username: s.addressee,
    }))
    return [...friendRows, ...sentRows]
  }

  async function load() {
    try {
      setError(null)
      const [p, f, s] = await Promise.all([
        fetchPendingRequests(),
        fetchFriends(),
        fetchSentRequests(),
      ])
      setPending(p)
      const next = buildRows(f, s)
      setRows(next)
      const validIds = new Set(next.filter(r => r.id != null).map(r => r.id as number))
      setSelected(prev => new Set([...prev].filter(id => validIds.has(id))))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load friends')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleInvite() {
    const username = inviteUsername.trim()
    if (!username) return
    setInviteSending(true)
    setInviteError(null)
    setInviteSuccess(null)
    try {
      const result = await requestFriendship(username)
      setInviteUsername('')
      setInviteSuccess(`Friend request sent to ${username}.`)
      // Optimistically add to lower pane
      setRows(prev => [...prev, { kind: 'sent', id: result.id, username: result.addressee }])
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Failed to send request')
    } finally {
      setInviteSending(false)
    }
  }

  async function handleAccept(id: number) {
    setSaving(s => ({ ...s, [`accept-${id}`]: true }))
    try {
      await acceptFriendship(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept request')
    } finally {
      setSaving(s => { const n = { ...s }; delete n[`accept-${id}`]; return n })
    }
  }

  async function handleDecline(id: number) {
    setSaving(s => ({ ...s, [`decline-${id}`]: true }))
    try {
      await declineFriendship(id)
      setPending(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to decline request')
    } finally {
      setSaving(s => { const n = { ...s }; delete n[`decline-${id}`]; return n })
    }
  }

  async function handleDeleteSelected() {
    const ids = [...selected]
    setSaving(s => ({ ...s, ...Object.fromEntries(ids.map(id => [`delete-${id}`, true])) }))
    try {
      await Promise.all(ids.map(id => removeFriendship(id)))
      await load()
      setSelected(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove friendship')
    } finally {
      setSaving(s => { const n = { ...s }; ids.forEach(id => delete n[`delete-${id}`]); return n })
    }
  }

  const selectableRows = rows.filter(r => r.id != null)
  const allSelected = selectableRows.length > 0 && selectableRows.every(r => selected.has(r.id as number))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectableRows.map(r => r.id as number)))
    }
  }

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
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
          <Link to="/groups" className="btn-ghost btn-sm">Groups</Link>
          <button className="btn-ghost btn-sm" onClick={logout} title="Sign out">
            <SignOutIcon />
          </button>
        </div>
      </header>

      <div style={{ padding: '32px 48px', maxWidth: 960, margin: '0 auto' }}>

        {error && (
          <div style={{ color: 'var(--crimson)', fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        {/* ── Invite ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-100)', marginBottom: 12 }}>
            Add a Friend
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="field-input"
              style={{ width: 220 }}
              type="text"
              placeholder="username"
              value={inviteUsername}
              onChange={e => { setInviteUsername(e.target.value); setInviteSuccess(null); setInviteError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
            />
            <button
              className="btn-ghost btn-sm"
              disabled={!inviteUsername.trim() || inviteSending}
              onClick={handleInvite}
            >
              {inviteSending ? 'Sending…' : 'Send Request'}
            </button>
          </div>
          {inviteSuccess && <p style={{ fontSize: 13, color: 'var(--sage)', marginTop: 8 }}>{inviteSuccess}</p>}
          {inviteError && <p style={{ fontSize: 13, color: 'var(--crimson)', marginTop: 8 }}>{inviteError}</p>}
        </section>

        {/* ── Incoming pending requests ──────────────────────────── */}
        {!loading && pending.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-100)', marginBottom: 12 }}>
              Pending Requests ({pending.length})
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ink-800)' }}>
                  <th style={th}>From</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--ink-900)' }}>
                    <td style={td}>{req.requester}</td>
                    <td style={{ ...td, display: 'flex', gap: 8 }}>
                      <button
                        className="btn-primary btn-sm"
                        disabled={saving[`accept-${req.id}`] || saving[`decline-${req.id}`]}
                        onClick={() => handleAccept(req.id)}
                      >
                        {saving[`accept-${req.id}`] ? 'Accepting…' : 'Accept'}
                      </button>
                      <button
                        className="btn-ghost btn-sm"
                        disabled={saving[`accept-${req.id}`] || saving[`decline-${req.id}`]}
                        onClick={() => handleDecline(req.id)}
                      >
                        {saving[`decline-${req.id}`] ? 'Declining…' : 'Decline'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ── Friends & sent requests ────────────────────────────── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-100)', margin: 0 }}>
              {loading ? 'Friends' : `Friends (${rows.length})`}
            </h2>
            <button
              className="btn-ghost btn-sm"
              disabled={selected.size === 0}
              onClick={handleDeleteSelected}
            >
              Delete{selected.size > 0 ? ` ${selected.size} selected` : ''}
            </button>
          </div>

          {loading ? (
            <p className="text-ink-400 font-mono text-sm animate-pulse">LOADING…</p>
          ) : rows.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--ink-500)' }}>No friends yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ink-800)' }}>
                  <th style={{ ...th, width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={selectableRows.length === 0}
                    />
                  </th>
                  <th style={th}>Username</th>
                  <th style={th}>Full Name</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id ?? `row-${i}`} style={{ borderBottom: '1px solid var(--ink-900)' }}>
                    <td style={{ ...td, width: 40 }}>
                      <input
                        type="checkbox"
                        disabled={row.id == null}
                        checked={row.id != null && selected.has(row.id)}
                        onChange={() => row.id != null && toggleOne(row.id)}
                      />
                    </td>
                    <td style={td}>{row.username}</td>
                    <td style={{ ...td, color: row.kind === 'friend' && row.full_name ? 'var(--ink-200)' : 'var(--ink-500)' }}>
                      {row.kind === 'friend' ? (row.full_name ?? '—') : '—'}
                    </td>
                    <td style={td}>
                      {row.kind === 'sent' && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-400)',
                          background: 'var(--ink-800)',
                          borderRadius: 4,
                          padding: '2px 6px',
                        }}>
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
