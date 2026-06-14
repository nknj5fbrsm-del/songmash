import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MessageCircle, Trash2, X } from 'lucide-react'
import {
  ForumApiError,
  forumDeleteLoungeMessage,
  forumFetchLoungeMessages,
  forumSendLoungeMessage,
} from '../../lib/forumApi'
import { formatForumDate } from '../../lib/forumFormat'
import type { ForumLoungeMessage } from '../../types/forum'

const POLL_MS = 10_000
const STICKY_NAV_OFFSET = 'calc(4.5rem + env(safe-area-inset-bottom, 0px))'

interface ForumLoungeSheetProps {
  open: boolean
  onClose: () => void
  displayName: string
  moderatorUnlocked: boolean
}

function mergeMessages(
  existing: ForumLoungeMessage[],
  incoming: ForumLoungeMessage[],
): ForumLoungeMessage[] {
  if (!incoming.length) return existing
  const ids = new Set(existing.map((m) => m.id))
  const added = incoming.filter((m) => !ids.has(m.id))
  if (!added.length) return existing
  return [...existing, ...added]
}

export function ForumLoungeSheet({
  open,
  onClose,
  displayName,
  moderatorUnlocked,
}: ForumLoungeSheetProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const [messages, setMessages] = useState<ForumLoungeMessage[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const lastCreatedAtRef = useRef<string | null>(null)
  const shouldStickToBottomRef = useRef(true)

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  const fetchMessages = useCallback(async (initial: boolean) => {
    try {
      const data = await forumFetchLoungeMessages(
        initial ? undefined : (lastCreatedAtRef.current ?? undefined),
      )
      if (initial) {
        setMessages(data.messages)
        if (data.messages.length) {
          lastCreatedAtRef.current = data.messages[data.messages.length - 1].createdAt
        } else {
          lastCreatedAtRef.current = null
        }
        return
      }

      if (data.messages.length) {
        setMessages((prev) => mergeMessages(prev, data.messages))
        lastCreatedAtRef.current = data.messages[data.messages.length - 1].createdAt
      }
    } catch (err) {
      if (initial) {
        setError(err instanceof ForumApiError ? err.message : 'Chat konnte nicht geladen werden.')
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return

    setError('')
    setLoading(true)
    shouldStickToBottomRef.current = true
    void fetchMessages(true).finally(() => setLoading(false))

    const poll = () => {
      if (document.visibilityState !== 'visible') return
      void fetchMessages(false)
    }

    const intervalId = window.setInterval(poll, POLL_MS)
    document.addEventListener('visibilitychange', poll)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [open, fetchMessages])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open || !shouldStickToBottomRef.current) return
    scrollToBottom()
  }, [open, messages, scrollToBottom])

  const handleListScroll = () => {
    const el = listRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldStickToBottomRef.current = distanceFromBottom < 80
  }

  const handleSend = async () => {
    const trimmed = draft.trim()
    if (!trimmed || sending) return

    setSending(true)
    setError('')
    try {
      const message = await forumSendLoungeMessage({
        body: trimmed,
        authorName: displayName,
      })
      setDraft('')
      setMessages((prev) => mergeMessages(prev, [message]))
      lastCreatedAtRef.current = message.createdAt
      shouldStickToBottomRef.current = true
      requestAnimationFrame(scrollToBottom)
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Nachricht konnte nicht gesendet werden.')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!moderatorUnlocked || deletingId) return
    setDeletingId(messageId)
    setError('')
    try {
      await forumDeleteLoungeMessage(messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Löschen fehlgeschlagen.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[45]" style={{ bottom: STICKY_NAV_OFFSET }}>
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Chat schließen"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[min(70dvh,560px)] flex-col overflow-hidden rounded-t-2xl border border-neutral-800 bg-neutral-950/98 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-lime-400" aria-hidden />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-neutral-100">
                Lounge
              </h2>
              <p className="text-xs text-neutral-500">Gemeinsamer Chat · Nachrichten bis 5 Tage</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Chat schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          ref={listRef}
          onScroll={handleListScroll}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-4 py-3"
        >
          {loading && messages.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
              Lädt…
            </div>
          )}

          {!loading && messages.length === 0 && (
            <p className="text-sm text-neutral-500">Noch keine Nachrichten. Sag hallo!</p>
          )}

          {messages.map((message) => {
            const own = message.authorName === displayName
            return (
              <div
                key={message.id}
                className={`group flex gap-2 ${own ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    own
                      ? 'bg-lime-400/15 text-neutral-100'
                      : 'bg-neutral-900 text-neutral-200'
                  }`}
                >
                  <div className={`mb-0.5 flex items-center gap-2 ${own ? 'justify-end' : ''}`}>
                    <span className="text-xs font-semibold text-lime-300/90">
                      {message.authorName}
                    </span>
                    <span className="text-[10px] text-neutral-600">
                      {formatForumDate(message.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                </div>
                {moderatorUnlocked && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(message.id)}
                    disabled={deletingId === message.id}
                    className="mt-1 shrink-0 self-start rounded-lg p-1.5 text-neutral-700 opacity-0 transition-opacity hover:bg-neutral-800 hover:text-red-300 group-hover:opacity-100"
                    aria-label="Nachricht löschen"
                  >
                    {deletingId === message.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <footer className="shrink-0 border-t border-neutral-800 px-4 py-3">
          {error && <p className="mb-2 text-xs text-red-300">{error}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 400))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Nachricht schreiben…"
              maxLength={400}
              className="input-field min-w-0 flex-1 !py-2 !text-sm"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !draft.trim()}
              className="btn-primary shrink-0 !px-4 !py-2 text-sm"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Senden'}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
