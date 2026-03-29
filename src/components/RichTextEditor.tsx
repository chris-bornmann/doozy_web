import { useRef, useEffect, useCallback } from 'react'
import { sanitizeHtml } from '../utils/sanitize'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  maxLength?: number
  className?: string
}

export default function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Add a description…',
  maxLength = 128,
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(true)

  useEffect(() => {
    if (editorRef.current && initRef.current) {
      // Sanitize before setting editor content
      editorRef.current.innerHTML = sanitizeHtml(value)
      initRef.current = false
    }
  }, [value])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    const text = editorRef.current.innerText
    if (text.length > maxLength) {
      editorRef.current.innerText = text.slice(0, maxLength)
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(editorRef.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
      return
    }
    onChange(sanitizeHtml(editorRef.current.innerHTML))
  }, [onChange, maxLength])

  function execFormat(command: string) {
    editorRef.current?.focus()
    document.execCommand(command, false)
    handleInput()
  }

  return (
    <div className={`rte-wrapper ${className}`}>
      <div className="rte-toolbar">
        <button
          type="button"
          className="rte-btn"
          title="Bold (Ctrl+B)"
          onMouseDown={e => { e.preventDefault(); execFormat('bold') }}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="rte-btn rte-italic"
          title="Italic (Ctrl+I)"
          onMouseDown={e => { e.preventDefault(); execFormat('italic') }}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="rte-btn rte-underline"
          title="Underline (Ctrl+U)"
          onMouseDown={e => { e.preventDefault(); execFormat('underline') }}
        >
          <u>U</u>
        </button>
        <div className="rte-toolbar-sep" />
        <button
          type="button"
          className="rte-btn"
          title="Bullet list"
          onMouseDown={e => { e.preventDefault(); execFormat('insertUnorderedList') }}
        >
          ≡
        </button>
      </div>
      <div
        ref={editorRef}
        className="rte-body"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={onBlur}
        data-placeholder={placeholder}
      />
    </div>
  )
}
