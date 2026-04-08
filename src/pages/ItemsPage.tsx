import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { fetchItems, deleteItem, reorderItem } from '../api/items'
import type { Item, SortBy } from '../types'
import { useAuth } from '../context/AuthContext'
import ItemRow from '../components/ItemRow'
import CreateItemModal from '../components/CreateItemModal'
import AiCommandBar from '../components/AiCommandBar'

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'created_on', label: 'Created' },
  { value: 'due_on', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'state', label: 'State' },
  { value: 'name', label: 'Name' },
  { value: 'custom', label: 'Custom' },
]

export default function ItemsPage() {
  const { user, logout } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('created_on')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const loadItems = useCallback(
    async (sort: SortBy) => {
      setLoading(true)
      setError('')
      try {
        const page = await fetchItems(sort)
        let list = page.items
        if (sort === 'name') {
          list = [...list].sort((a, b) => a.name.localeCompare(b.name))
        } else if (sort === 'priority') {
          // HIGH=0, MEDIUM=1, LOW=2 — sort ascending so HIGH comes first; nulls last
          list = [...list].sort((a, b) => {
            const pa = a.priority ?? 999
            const pb = b.priority ?? 999
            return pa - pb
          })
        }
        setItems(list)
        setSelected(new Set())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load items')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    loadItems(sortBy)
  }, [sortBy, loadItems])

  function handleSortChange(s: SortBy) {
    setSortBy(s)
    setSelected(new Set())
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === items.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(items.map(i => i.id!)))
    }
  }

  function handleItemUpdate(updated: Item) {
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} item${selected.size > 1 ? 's' : ''}?`)) return
    setDeleting(true)
    const ids = Array.from(selected)
    try {
      await Promise.all(ids.map(id => deleteItem(id)))
      setItems(prev => prev.filter(i => !selected.has(i.id!)))
      setSelected(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)  // optimistic update

    // The item placed at newIndex should go after the item before it
    const movedId = items[oldIndex].id!
    const afterId = newIndex === 0 ? null : reordered[newIndex - 1].id ?? null

    try {
      await reorderItem(movedId, afterId)
    } catch (err) {
      console.error('Reorder failed, re-fetching:', err)
      loadItems(sortBy)
    }
  }

  function handleCreated(newItem: Item) {
    setShowCreate(false)
    // Insert at the position appropriate for current sort
    setItems(prev => {
      if (sortBy === 'custom') return [newItem, ...prev]
      return [newItem, ...prev]  // will re-sort on next fetch; good enough for optimistic insert
    })
    // Reload to get correct order from server
    loadItems(sortBy)
  }

  const allSelected = items.length > 0 && selected.size === items.length
  const someSelected = selected.size > 0 && selected.size < items.length
  const isCustomSort = sortBy === 'custom'
  const itemIds = items.map(i => i.id!)

  return (
    <div className="items-page">
      {/* Header */}
      <header className="items-header">
        <div className="items-header-brand">
          <h1 className="items-brand-name">Doozy</h1>
          <span className="items-brand-sep">·</span>
          <span className="items-brand-user">
            {user?.full_name ?? user?.username ?? ''}
          </span>
        </div>

        <div className="items-header-actions">
          <AiCommandBar onSuccess={() => loadItems(sortBy)} />
          <button
            className="btn-primary btn-create"
            onClick={() => setShowCreate(true)}
          >
            <PlusIcon /> New Item
          </button>
          <button className="btn-ghost btn-sm" onClick={logout} title="Sign out">
            <SignOutIcon />
          </button>
        </div>
      </header>

      {/* Sort tabs */}
      <div className="items-sort-bar">
        <span className="items-sort-label">Sort by</span>
        <div className="items-sort-tabs">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`items-sort-tab ${sortBy === opt.value ? 'items-sort-tab--active' : ''}`}
              onClick={() => handleSortChange(opt.value)}
            >
              {opt.label}
              {opt.value === 'custom' && <DragHintIcon />}
            </button>
          ))}
        </div>

        {/* Selection toolbar */}
        {selected.size > 0 && (
          <div className="items-selection-bar">
            <span className="items-selection-count">
              {selected.size} selected
            </span>
            <button
              className="btn-danger btn-sm"
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : `Delete ${selected.size}`}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <main className="items-main">
        {loading ? (
          <div className="items-loading">
            <span className="items-loading-text">Loading your items…</span>
          </div>
        ) : error ? (
          <div className="items-error">
            <p>{error}</p>
            <button className="btn-ghost btn-sm" onClick={() => loadItems(sortBy)}>
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="items-empty">
            <p className="items-empty-title">Nothing here yet.</p>
            <p className="items-empty-sub">Create your first item to get started.</p>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <PlusIcon /> New Item
            </button>
          </div>
        ) : (
          <div className="items-list">
            {/* Select-all row */}
            <div className="items-list-header">
              <button
                className="item-checkbox items-select-all"
                onClick={toggleSelectAll}
                aria-label="Select all"
              >
                <div className={`item-checkbox-box ${allSelected ? 'item-checkbox-box--checked' : ''} ${someSelected ? 'item-checkbox-box--indeterminate' : ''}`}>
                  {allSelected && <CheckIcon />}
                  {someSelected && <MinusIcon />}
                </div>
              </button>
              <span className="items-list-count">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{ animationDelay: `${idx * 35}ms` }}
                    className="item-row-wrapper"
                  >
                    <ItemRow
                      item={item}
                      selected={selected.has(item.id!)}
                      onToggleSelect={toggleSelect}
                      onUpdate={handleItemUpdate}
                      sortable={isCustomSort}
                    />
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </main>

      {showCreate && (
        <CreateItemModal onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DragHintIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="3" cy="3" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="7" cy="3" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="3" cy="7" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="7" cy="7" r="1" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 3.5L4 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
      <path d="M1 1h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
