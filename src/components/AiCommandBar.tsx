import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { postAiRequest, type AiResponse } from '../api/ai'

interface AiCommandBarProps {
  onResult: (response: AiResponse) => void
}

export default function AiCommandBar({ onResult }: AiCommandBarProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorDialog, setErrorDialog] = useState<string | null>(null)
  const [httpError, setHttpError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setHttpError('')
    setLoading(true)
    try {
      const result = await postAiRequest(trimmed)
      if (result.error) {
        setErrorDialog(result.error)
      } else {
        onResult(result)
      }
    } catch (err) {
      setHttpError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setText('')
      setHttpError('')
      inputRef.current?.blur()
    }
  }

  return (
    <>
      <form className="ai-command-bar" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={`ai-command-input ${httpError ? 'ai-command-input--error' : ''}`}
          type="text"
          value={text}
          onChange={e => { setText(e.target.value); setHttpError('') }}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          disabled={loading}
          aria-label="AI command"
        />
        <button
          type="submit"
          className="ai-command-submit"
          disabled={loading || !text.trim()}
          title="Submit"
        >
          {loading ? <span className="btn-spinner btn-spinner--amber" /> : <SendIcon />}
        </button>
      </form>

      {httpError && (
        <div className="ai-error-toast" role="alert">
          {httpError}
          <button className="voice-error-dismiss" onClick={() => setHttpError('')}>✕</button>
        </div>
      )}

      {errorDialog && (
        <AiErrorDialog message={errorDialog} onClose={() => setErrorDialog(null)} />
      )}
    </>
  )
}

function AiErrorDialog({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal ai-response-modal"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ai-error-title"
      >
        <div className="modal-header">
          <h2 id="ai-error-title" className="modal-title">Request Error</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ai-response-body">
          <p className="ai-error-message">{message}</p>
        </div>

        <div className="modal-actions" style={{ padding: '0 24px 24px' }}>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M13 7.5L2 2l2.5 5.5L2 13l11-5.5z" fill="currentColor" />
    </svg>
  )
}
