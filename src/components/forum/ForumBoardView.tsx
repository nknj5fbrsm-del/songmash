import { useState, type FormEvent } from 'react'
import { Loader2, Lock, Pin, Plus } from 'lucide-react'
import { ForumNavBar } from './ForumNavBar'
import { ForumApiError, forumCreateThread } from '../../lib/forumApi'
import { formatForumDate } from '../../lib/forumFormat'
import { isForumThreadUnread } from '../../lib/forumReadStorage'
import type { ForumBoardDetail, ForumPendingAttachments, ForumThreadSummary } from '../../types/forum'
import type { Song } from '../../types/song'
import { ForumAttachmentPicker } from './ForumAttachmentPicker'
import { ForumSongEmbed } from './ForumSongEmbed'
import { ForumUnreadBadge } from './ForumUnreadBadge'

interface ForumBoardViewProps {
  board: ForumBoardDetail
  threads: ForumThreadSummary[]
  readRevision: number
  displayName: string
  songsById: Map<string, Song>
  pendingSong: Song | null
  onClearPendingSong: () => void
  onBack: () => void
  onHome: () => void
  onOpenThread: (threadId: string) => void
  onCreated: (threadId: string) => void
}

export function ForumBoardView({
  board,
  threads,
  readRevision,
  displayName,
  songsById,
  pendingSong,
  onClearPendingSong,
  onBack,
  onHome,
  onOpenThread,
  onCreated,
}: ForumBoardViewProps) {
  void readRevision

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<ForumPendingAttachments>({})

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const threadId = await forumCreateThread({
        boardId: board.id,
        title: title.trim(),
        body: body.trim(),
        authorName: displayName,
        songId: pendingSong?.id,
        imageUrl: attachments.imageUrl,
        audioUrl: attachments.audioUrl,
      })
      setTitle('')
      setBody('')
      setAttachments({})
      setShowForm(false)
      onClearPendingSong()
      onCreated(threadId)
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Thema konnte nicht erstellt werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <ForumNavBar
        backLabel="Zurück zur Übersicht"
        onBack={onBack}
        onHome={onHome}
        showHomeLink={false}
      />

      <header className="mb-5">
        <p className="text-xs uppercase tracking-wider text-neutral-600">{board.categoryName}</p>
        <h1 className="page-title text-2xl">{board.name}</h1>
        {board.description && <p className="page-subtitle text-sm">{board.description}</p>}
      </header>

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="btn-ghost mb-4 w-full sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        Neues Thema
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            className="input-field"
            placeholder="Titel des Themas"
            required
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 10000))}
            className="input-field min-h-[120px] resize-y"
            placeholder="Dein erster Beitrag…"
            required
          />
          {pendingSong && (
            <div className="space-y-2">
              <ForumSongEmbed song={pendingSong} compact />
              <button
                type="button"
                onClick={onClearPendingSong}
                className="text-xs text-neutral-500 hover:text-neutral-300"
              >
                Song entfernen
              </button>
            </div>
          )}
          <ForumAttachmentPicker
            attachments={attachments}
            onChange={setAttachments}
            disabled={loading}
          />
          {error && <p className="alert-error text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Veröffentlichen
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {threads.length === 0 ? (
        <p className="text-center text-neutral-500">Noch keine Themen — sei der Erste!</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-neutral-800">
          {threads.map((thread, index) => {
            const song = thread.songId ? songsById.get(thread.songId) : undefined
            return (
              <li
                key={thread.id}
                className={index > 0 ? 'border-t border-neutral-800/80' : undefined}
              >
                <button
                  type="button"
                  onClick={() => onOpenThread(thread.id)}
                  className="flex w-full flex-col gap-1 px-4 py-3.5 text-left transition-colors hover:bg-neutral-800/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-2 font-medium text-neutral-100">
                      {thread.isPinned && (
                        <Pin className="h-3.5 w-3.5 shrink-0 text-lime-400" aria-label="Angepinnt" />
                      )}
                      {thread.isLocked && (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-red-400" aria-label="Geschlossen" />
                      )}
                      <span className="truncate">{thread.title}</span>
                      {isForumThreadUnread(thread.id, thread.updatedAt, board.id) && (
                        <ForumUnreadBadge />
                      )}
                    </p>
                    <span className="shrink-0 text-xs text-neutral-600">
                      {thread.postCount} {thread.postCount === 1 ? 'Beitrag' : 'Beiträge'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {thread.authorName} · {formatForumDate(thread.updatedAt)}
                  </p>
                  {song && <ForumSongEmbed song={song} compact />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
