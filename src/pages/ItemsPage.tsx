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
import { fetchTags } from '../api/tags'
import { fetchGroups } from '../api/groups'
import { fetchFriends } from '../api/friends'
import type { AiResponse } from '../api/ai'
import type { ItemRead, ItemFilter, FiltersState, SortBy, Tag, GroupRead, FriendUser } from '../types'
import { EMPTY_FILTERS } from '../types'
import { useAuth } from '../context/AuthContext'
import ItemRow from '../components/ItemRow'
import NavMenu from '../components/NavMenu'
import CreateItemModal from '../components/CreateItemModal'
import AiCommandBar from '../components/AiCommandBar'
import FilterDropdown from '../components/FilterDropdown'
import FiltersModal from '../components/FiltersModal'

function itemFilterToFiltersState(f: ItemFilter): FiltersState {
  return {
    name: f.name ?? '',
    states: new Set(f.state ?? []),
    priorities: new Set(f.priority ?? []),
    createdStart: f.created_after ?? f.created_on ?? null,
    createdEnd:   f.created_before ?? f.created_on ?? null,
    dueStart:     f.due_after ?? f.due_on ?? null,
    dueEnd:       f.due_before ?? f.due_on ?? null,
    completedStart: f.completed_after ?? f.completed_on ?? null,
    completedEnd:   f.completed_before ?? f.completed_on ?? null,
    groupIds: f.group_ids ?? [],
  }
}

function applyDateRange(
  filter: ItemFilter,
  start: string | null,
  end: string | null,
  prefix: 'created' | 'due' | 'completed',
) {
  if (!start && !end) return
  if (start && end) {
    const s = start.split('T')[0]
    const e = end.split('T')[0]
    if (s === e) {
      (filter as Record<string, unknown>)[`${prefix}_on`] = s
    } else {
      (filter as Record<string, unknown>)[`${prefix}_after`] = start
      ;(filter as Record<string, unknown>)[`${prefix}_before`] = end
    }
  } else if (start) {
    (filter as Record<string, unknown>)[`${prefix}_after`] = start
  } else {
    (filter as Record<string, unknown>)[`${prefix}_before`] = end
  }
}


export default function ItemsPage() {
  const { user, logout, can } = useAuth()
  const [items, setItems] = useState<ItemRead[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('created_on')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pageNum, setPageNum] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  // Tag filter state
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [filterTagIds, setFilterTagIds] = useState<Set<number>>(new Set())

  // Groups + friends (for filter dropdown and item assignment)
  const [myGroups, setMyGroups] = useState<GroupRead[]>([])
  const [myFriends, setMyFriends] = useState<FriendUser[]>([])
  const [filterGroupIds, setFilterGroupIds] = useState<Set<number>>(new Set())

  // Advanced filter state
  const [advancedFilter, setAdvancedFilter] = useState<FiltersState>(EMPTY_FILTERS)
  const [showFiltersModal, setShowFiltersModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const loadItems = useCallback(
    async (sort: SortBy, order: 'asc' | 'desc', page: number, size: number, filter: ItemFilter = {}) => {
      setLoading(true)
      setError('')
      try {
        const result = await fetchItems(sort, page, size, filter)
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
        if (order === 'desc') list = [...list].reverse()
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

  function buildFilter(tagIds: Set<number>, tags: Tag[], adv: FiltersState, groupIds: Set<number>): ItemFilter {
    const tagNames = tags.filter(t => tagIds.has(t.id!)).map(t => t.name)
    const filter: ItemFilter = {}
    if (tagNames.length > 0) filter.tags = tagNames
    if (groupIds.size > 0) filter.group_ids = Array.from(groupIds)
    if (adv.name.trim()) filter.name = adv.name.trim()
    if (adv.states.size > 0) filter.state = Array.from(adv.states)
    if (adv.priorities.size > 0) filter.priority = Array.from(adv.priorities)
    applyDateRange(filter, adv.createdStart, adv.createdEnd, 'created')
    applyDateRange(filter, adv.dueStart, adv.dueEnd, 'due')
    applyDateRange(filter, adv.completedStart, adv.completedEnd, 'completed')
    return filter
  }

  useEffect(() => {
    loadItems(sortBy, sortOrder, pageNum, pageSize, buildFilter(filterTagIds, availableTags, advancedFilter, filterGroupIds))
  }, [sortBy, sortOrder, pageNum, pageSize, filterTagIds, availableTags, advancedFilter, filterGroupIds, loadItems])

  // Load tags, groups, and friends once on mount
  useEffect(() => {
    fetchTags().then(tags => setAvailableTags(tags)).catch(() => {})
    fetchGroups().then(g => setMyGroups(g)).catch(() => {})
    fetchFriends().then(f => setMyFriends(f)).catch(() => {})
  }, [])

  function handleSortChange(s: SortBy) {
    if (s === sortBy) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(s)
      setSortOrder('asc')
    }
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

  function handleItemUpdate(updated: ItemRead) {
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))
  }

  function handleItemRemove(id: number) {
    setItems(prev => prev.filter(i => i.id !== id))
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
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
      loadItems(sortBy, sortOrder, pageNum, pageSize, buildFilter(filterTagIds, availableTags, advancedFilter, filterGroupIds))
    }
  }

  function handleCreated() {
    setShowCreate(false)
    loadItems(sortBy, sortOrder, pageNum, pageSize, buildFilter(filterTagIds, availableTags, advancedFilter, filterGroupIds))
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

  function toggleFilterGroup(groupId: number) {
    setFilterGroupIds(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
    setSelected(new Set())
  }

  const displayedItems = items

  const isFilterActive =
    advancedFilter.name.trim() !== '' ||
    advancedFilter.states.size > 0 ||
    advancedFilter.priorities.size > 0 ||
    advancedFilter.createdStart !== null || advancedFilter.createdEnd !== null ||
    advancedFilter.dueStart !== null || advancedFilter.dueEnd !== null ||
    advancedFilter.completedStart !== null || advancedFilter.completedEnd !== null

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
          {can('ai', 'use') && <AiCommandBar onResult={(result: AiResponse) => {
            if (result.operation === 'list' && result.filter) {
              setAdvancedFilter(itemFilterToFiltersState(result.filter))
            } else {
              loadItems(sortBy, sortOrder, pageNum, pageSize, buildFilter(filterTagIds, availableTags, advancedFilter, filterGroupIds))
            }
          }} />}
          <button
            className="btn-primary btn-create"
            onClick={() => setShowCreate(true)}
          >
            <PlusIcon /> <span className="btn-create-label">New Item</span>
          </button>
          <NavMenu />
          <button className="btn-ghost btn-sm" onClick={logout} title="Sign out">
            <SignOutIcon />
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="items-toolbar">
        <div className="items-toolbar-search">
          <SearchIcon />
          <input
            className="items-toolbar-search-input"
            placeholder="Search work…"
            value={advancedFilter.name}
            onChange={e => setAdvancedFilter(f => ({ ...f, name: e.target.value }))}
          />
        </div>

        <FilterDropdown
          label="Tag"
          options={availableTags.map(t => ({ id: t.id!, label: t.name }))}
          selected={filterTagIds}
          onToggle={toggleFilterTag}
          onClear={() => { setFilterTagIds(new Set()); setSelected(new Set()) }}
        />
        {myGroups.length > 0 && (
          <FilterDropdown
            label="Group"
            options={myGroups.map(g => ({ id: g.id, label: g.name }))}
            selected={filterGroupIds}
            onToggle={toggleFilterGroup}
            onClear={() => { setFilterGroupIds(new Set()); setSelected(new Set()) }}
          />
        )}
        <button
          className={`filter-dropdown-trigger${isFilterActive ? ' filter-dropdown-trigger--active' : ''}`}
          onClick={() => setShowFiltersModal(true)}
        >
          <FiltersIcon />
          Filter{isFilterActive ? ' ·' : ''}
        </button>

        {/* Selection toolbar */}
        {selected.size > 0 && (
          <div className="items-selection-bar">
            <span className="items-selection-count">{selected.size} selected</span>
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
            <button className="btn-ghost btn-sm" onClick={() => loadItems(sortBy, sortOrder, pageNum, pageSize, buildFilter(filterTagIds, availableTags, advancedFilter, filterGroupIds))}>
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
            {/* Column headers */}
            <div className="items-col-header">
              <div className="items-col-header-checkbox">
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
              </div>
              {/* Work column */}
              <button
                className={`col-header-btn${sortBy === 'name' ? ' col-header-btn--active' : ''}`}
                onClick={() => handleSortChange('name')}
              >
                Work {sortBy === 'name' && <span className="col-header-sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </button>
              {/* Owner — not sortable */}
              <span className="col-header-btn col-header-owner" style={{ cursor: 'default' }}>Owner</span>
              {/* Priority */}
              <button
                className={`col-header-btn${sortBy === 'priority' ? ' col-header-btn--active' : ''}`}
                onClick={() => handleSortChange('priority')}
              >
                Priority {sortBy === 'priority' && <span className="col-header-sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </button>
              {/* Status */}
              <button
                className={`col-header-btn${sortBy === 'state' ? ' col-header-btn--active' : ''}`}
                onClick={() => handleSortChange('state')}
              >
                Status {sortBy === 'state' && <span className="col-header-sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </button>
              {/* Due Date */}
              <button
                className={`col-header-btn${sortBy === 'due_on' ? ' col-header-btn--active' : ''}`}
                onClick={() => handleSortChange('due_on')}
              >
                Due Date {sortBy === 'due_on' && <span className="col-header-sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </button>
              {/* Created */}
              <button
                className={`col-header-btn col-header-created${sortBy === 'created_on' ? ' col-header-btn--active' : ''}`}
                onClick={() => handleSortChange('created_on')}
              >
                Created {sortBy === 'created_on' && <span className="col-header-sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </button>
              <div className="col-header-actions">
                <ColsIcon />
              </div>
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
                    style={{ animationDelay: `${idx * 25}ms` }}
                    className="item-row-wrapper"
                  >
                    <ItemRow
                      item={item}
                      selected={selected.has(item.id!)}
                      onToggleSelect={toggleSelect}
                      onUpdate={handleItemUpdate}
                      onRemove={handleItemRemove}
                      sortable={isCustomSort}
                      myGroups={myGroups}
                      myFriends={myFriends}
                    />
                  </div>
                ))}
              </SortableContext>
            </DndContext>

            {/* Footer */}
            <div className="items-footer">
              <button className="items-footer-create" onClick={() => setShowCreate(true)}>
                <PlusIcon /> New Item
              </button>
              <span className="items-footer-count">
                {displayedItems.length} item{displayedItems.length !== 1 ? 's' : ''}
                {totalPages > 1 && ` · Page ${pageNum} of ${totalPages}`}
              </span>
              <div className="items-footer-nav">
                <button
                  className="items-page-btn"
                  onClick={() => setPageNum(p => Math.max(1, p - 1))}
                  disabled={pageNum === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  className="items-page-btn"
                  onClick={() => setPageNum(p => Math.min(totalPages, p + 1))}
                  disabled={pageNum === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {showCreate && (
        <CreateItemModal onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      )}

      {showFiltersModal && (
        <FiltersModal
          initial={advancedFilter}
          onApply={f => { setAdvancedFilter(f); setShowFiltersModal(false) }}
          onClose={() => setShowFiltersModal(false)}
        />
      )}
    </div>
  )
}

function FiltersIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1 2.5h11M3 6.5h7M5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ColsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="1" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
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
