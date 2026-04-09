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
import { fetchTags, fetchItemIdsByTag } from '../api/tags'
import type { Item, SortBy, Tag } from '../types'
import { useAuth } from '../context/AuthContext'
import ItemRow from '../components/ItemRow'
import CreateItemModal from '../components/CreateItemModal'
import AiCommandBar from '../components/AiCommandBar'
import FilterDropdown from '../components/FilterDropdown'

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
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  // Tag filter state
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [filterTagIds, setFilterTagIds] = useState<Set<number>>(new Set())
  const [filterItemIds, setFilterItemIds] = useState<Set<number> | null>(null)
  const [filterLoading, setFilterLoading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const loadItems = useCallback(
    async (sort: SortBy, page: number, size: number) => {
      setLoading(true)
      setError('')
      try {
        const result = await fetchItems(sort, page, size)
        let list = result.items
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
        setTotalPages(result.pages)
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
    loadItems(sortBy, pageNum, pageSize)
  }, [sortBy, pageNum, pageSize, loadItems])

  // Load all available tags once on mount
  useEffect(() => {
    fetchTags().then(tags => setAvailableTags(tags)).catch(() => {})
  }, [])

  // When the active filter tags change, fetch the matching item IDs for each tag
  // then intersect them (AND logic: item must have ALL selected tags)
  useEffect(() => {
    if (filterTagIds.size === 0) {
      setFilterItemIds(null)
      return
    }
    let cancelled = false
    setFilterLoading(true)
    Promise.all(Array.from(filterTagIds).map(tagId => fetchItemIdsByTag(tagId)))
      .then(results => {
        if (cancelled) return
        const union = new Set(results.flat())
        setFilterItemIds(union)
      })
      .catch(() => { if (!cancelled) setFilterItemIds(null) })
      .finally(() => { if (!cancelled) setFilterLoading(false) })
    return () => { cancelled = true }
  }, [filterTagIds])

  function handleSortChange(s: SortBy) {
    setSortBy(s)
    setPageNum(1)
    setSelected(new Set())
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPageNum(1)
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
    if (selected.size === displayedItems.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(displayedItems.map(i => i.id!)))
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
      loadItems(sortBy, pageNum, pageSize)
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
    loadItems(sortBy, pageNum, pageSize)
  }

  function toggleFilterTag(tagId: number) {
    setFilterTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
    setSelected(new Set())
  }

  const displayedItems = filterItemIds !== null
    ? items.filter(i => filterItemIds.has(i.id!))
    : items

  const allSelected = displayedItems.length > 0 && selected.size === displayedItems.length
  const someSelected = selected.size > 0 && selected.size < displayedItems.length
  const isCustomSort = sortBy === 'custom'
  const itemIds = displayedItems.map(i => i.id!)

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
          <AiCommandBar onSuccess={() => loadItems(sortBy, pageNum, pageSize)} />
          <button
            className="btn-primary btn-create"
            onClick={() => setShowCreate(true)}
          >
            <PlusIcon /> <span className="btn-create-label">New Item</span>
          </button>
          <button className="btn-ghost btn-sm" onClick={logout} title="Sign out">
            <SignOutIcon />
          </button>
        </div>
      </header>

      {/* Sort + filter bar */}
      <div className="items-sort-bar">
        <label className="items-sort-label" htmlFor="sort-select">Sort by</label>
        <select
          id="sort-select"
          className="items-sort-select"
          value={sortBy}
          onChange={e => handleSortChange(e.target.value as SortBy)}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="items-toolbar-divider" />
        <FilterDropdown
          label="Tag"
          options={availableTags.map(t => ({ id: t.id!, label: t.name }))}
          selected={filterTagIds}
          onToggle={toggleFilterTag}
          onClear={() => { setFilterTagIds(new Set()); setSelected(new Set()) }}
        />
        {filterLoading && <span className="items-filter-loading">…</span>}

        <div className="items-toolbar-divider" />
        <label className="items-sort-label" htmlFor="page-size-select">Items</label>
        <select
          id="page-size-select"
          className="items-sort-select"
          value={pageSize}
          onChange={e => handlePageSizeChange(Number(e.target.value))}
        >
          {[10, 20, 50, 100].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

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
            <button className="btn-ghost btn-sm" onClick={() => loadItems(sortBy, pageNum, pageSize)}>
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
        ) : displayedItems.length === 0 ? (
          <div className="items-empty">
            <p className="items-empty-title">No items match the selected filters.</p>
            <p className="items-empty-sub">Try removing a filter tag to see more results.</p>
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
                {displayedItems.length} item{displayedItems.length !== 1 ? 's' : ''}
                {filterItemIds !== null && (
                  <span className="items-list-count-filtered"> (filtered from {items.length})</span>
                )}
              </span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                {displayedItems.map((item, idx) => (
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

            {totalPages > 1 && (
              <div className="items-pagination">
                <button
                  className="items-page-btn"
                  onClick={() => setPageNum(p => Math.max(1, p - 1))}
                  disabled={pageNum === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon />
                </button>
                <span className="items-page-info">
                  Page {pageNum} of {totalPages}
                </span>
                <button
                  className="items-page-btn"
                  onClick={() => setPageNum(p => Math.min(totalPages, p + 1))}
                  disabled={pageNum === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            )}
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


function ChevronLeftIcon() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
