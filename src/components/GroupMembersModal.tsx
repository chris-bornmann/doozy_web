import { useState } from 'react'
import { addMember, removeMember } from '../api/groups'
import { useAuth } from '../context/useAuth'
import type { GroupRead } from '../types'

interface Props {
  group: GroupRead
  friends: string[]
  onUpdate: (g: GroupRead) => void
  onClose: () => void
}

export default function GroupMembersModal({ group: initialGroup, friends, onUpdate, onClose }: Props) {
  const { user } = useAuth()
  const isOwner = user?.username === initialGroup.owner
  const [group, setGroup] = useState(initialGroup)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const addableFriends = friends.filter(f => !group.members.includes(f))
  const [selectedFriend, setSelectedFriend] = useState(addableFriends[0] ?? '')

  // Keep selectedFriend valid as members change
  const effectiveSelected = addableFriends.includes(selectedFriend) ? selectedFriend : (addableFriends[0] ?? '')

  async function handleAdd() {
    if (!effectiveSelected) return
    setSaving(s => ({ ...s, [`add-${effectiveSelected}`]: true }))
    setError(null)
    try {
      const updated = await addMember(group.id, effectiveSelected)
      setGroup(updated)
      onUpdate(updated)
      setSelectedFriend(addableFriends.filter(f => f !== effectiveSelected)[0] ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add member')
    } finally {
      setSaving(s => { const n = { ...s }; delete n[`add-${effectiveSelected}`]; return n })
    }
  }

  async function handleRemove(username: string) {
    setSaving(s => ({ ...s, [`remove-${username}`]: true }))
    setError(null)
    try {
      await removeMember(group.id, username)
      const updated = { ...group, members: group.members.filter(m => m !== username) }
      setGroup(updated)
      onUpdate(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove member')
    } finally {
      setSaving(s => { const n = { ...s }; delete n[`remove-${username}`]; return n })
    }
  }

  const newAddableFriends = friends.filter(f => !group.members.includes(f))

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{group.name}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {error && (
            <div style={{ color: 'var(--crimson)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}

          {/* Members list */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-400)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              Members ({group.members.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {group.members.map(member => (
                <div key={member} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--ink-900)', borderRadius: 6 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink-200)' }}>
                    {member}
                    {member === group.owner && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-500)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        owner
                      </span>
                    )}
                  </span>
                  {isOwner && member !== group.owner && (
                    <button
                      className="btn-ghost btn-sm"
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      disabled={!!saving[`remove-${member}`]}
                      onClick={() => handleRemove(member)}
                    >
                      {saving[`remove-${member}`] ? '…' : 'Remove'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add member — only visible to the group owner */}
          {isOwner && newAddableFriends.length > 0 ? (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-400)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Add Member
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="field-input"
                  style={{ flex: 1 }}
                  value={effectiveSelected}
                  onChange={e => setSelectedFriend(e.target.value)}
                >
                  {newAddableFriends.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <button
                  className="btn-ghost btn-sm"
                  disabled={!effectiveSelected || !!saving[`add-${effectiveSelected}`]}
                  onClick={handleAdd}
                >
                  {saving[`add-${effectiveSelected}`] ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          ) : isOwner ? (
            <p style={{ fontSize: 13, color: 'var(--ink-500)' }}>
              {friends.length === 0 ? 'Add friends first to invite them to a group.' : 'All friends are already members.'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
