import { useState, useEffect, useRef, useCallback } from 'react'
import type { Tag } from '../types'
import { fetchTags, createTag, fetchItemTags, assignTag, removeItemTag } from '../api/tags'

interface TagEditorProps {
  itemId: number
}

export default function TagEditor({ itemId }: TagEditorProps) {
  const [assigned, setAssigned] = useState<Tag[]>([])
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [loadingTags, setLoadingTags] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load assigned tags on mount
  useEffect(() => {
    let cancelled = false
    setLoadingTags(true)
    fetchItemTags(itemId)
      .then(tags => { if (!cancelled) setAssigned(Array.isArray(tags) ? tags : []) })
      .catch(() => { if (!cancelled) setError('Failed to load tags.') })
      .finally(() => { if (!cancelled) setLoadingTags(false) })
    return () => { cancelled = true }
  }, [itemId])

  // Fetch suggestions (debounced)
  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const all = await fetchTags(query || undefined)
        setSuggestions(all.filter(t => !assigned.some(a => a.id === t.id)))
        setActiveSuggestion(-1)
      } catch {
        setSuggestions([])
      }
    }, 200)
  }, [assigned])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInput(val)
    setError('')
    setShowSuggestions(true)
    fetchSuggestions(val)
  }

  function handleInputFocus() {
    setShowSuggestions(true)
    fetchSuggestions(input)
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function doAssign(tag: Tag) {
    if (!tag.id) return
    setWorking(true)
    setError('')
    try {
      await assignTag(itemId, tag.id)
      setAssigned(prev => [...prev, tag])
      setSuggestions(prev => prev.filter(s => s.id !== tag.id))
      setInput('')
      setShowSuggestions(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag.')
    } finally {
      setWorking(false)
    }
  }

  async function doRemove(tag: Tag) {
    if (!tag.id) return
    setWorking(true)
    setError('')
    try {
      await removeItemTag(itemId, tag.id)
      setAssigned(prev => prev.filter(a => a.id !== tag.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag.')
    } finally {
      setWorking(false)
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = input.trim()
      if (!trimmed) return

      // If a suggestion is highlighted, assign it
      if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
        doAssign(suggestions[activeSuggestion])
        return
      }

      // If there's an exact match in suggestions, assign it
      const exact = suggestions.find(s => s.name.toLowerCase() === trimmed.toLowerCase())
      if (exact) {
        doAssign(exact)
        return
      }

      // No match — create a new tag then assign it
      if (trimmed.length > 16) {
        setError('Tag name must be 16 characters or fewer.')
        return
      }
      setWorking(true)
      setError('')
      try {
        const newTag = await createTag(trimmed)
        await assignTag(itemId, newTag.id!)
        setAssigned(prev => [...prev, newTag])
        setInput('')
        setShowSuggestions(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create tag.')
      } finally {
        setWorking(false)
      }
    }
  }

  const visibleSuggestions = suggestions.filter(s => !assigned.some(a => a.id === s.id))

  return (
    <div className="tag-editor">
      {/* Assigned tag pills */}
      {loadingTags ? (
        <p className="tag-editor-loading">Loading tags…</p>
      ) : (
        <div className="tag-pills">
          {assigned.length === 0 && (
            <span className="tag-pills-empty">No tags assigned</span>
          )}
          {assigned.map(tag => (
            <span key={tag.id} className="tag-pill">
              {tag.name}
              <button
                className="tag-pill-remove"
                onClick={() => doRemove(tag)}
                disabled={working}
                aria-label={`Remove tag ${tag.name}`}
                title="Remove tag"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add tag input */}
      <div className="tag-input-wrapper">
        <input
          ref={inputRef}
          className="tag-input field-input"
          type="text"
          value={input}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder="Add tag… (type to search or create)"
          maxLength={16}
          disabled={working}
          autoComplete="off"
        />
        {showSuggestions && visibleSuggestions.length > 0 && (
          <div ref={dropdownRef} className="tag-suggestions">
            {visibleSuggestions.map((tag, idx) => (
              <button
                key={tag.id}
                className={`tag-suggestion-item ${idx === activeSuggestion ? 'tag-suggestion-item--active' : ''}`}
                onMouseDown={e => { e.preventDefault(); doAssign(tag) }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
        {showSuggestions && input.trim() && visibleSuggestions.length === 0 && !working && (
          <div ref={dropdownRef} className="tag-suggestions">
            <div className="tag-suggestion-create">
              Press <kbd>Enter</kbd> to create &ldquo;{input.trim()}&rdquo;
            </div>
          </div>
        )}
      </div>

      {error && <p className="tag-editor-error">{error}</p>}
    </div>
  )
}
