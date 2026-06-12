import { useMemo, useState, type FormEvent } from 'react'
import { ArrowRightLeft, Loader2, Trash2 } from 'lucide-react'
import { ForumNavBar } from './ForumNavBar'
import {
  ForumApiError,
  forumAdminMoveThread,
  forumCreatePost,
  forumDeletePost,
} from '../../lib/forumApi'
import { formatForumDate } from '../../lib/forumFormat'
import type { ForumCategory, ForumPost, ForumThreadDetail } from '../../types/forum'
import type { Song } from '../../types/song'
import { ForumSongEmbed } from './ForumSongEmbed'

interface ForumThreadViewProps {
  thread: ForumThreadDetail
  posts: ForumPost[]
  categories: ForumCategory[]
  displayName: string
  songsById: Map<string, Song>
  pendingSong: Song | null
  onClearPendingSong: () => void
  onBack: () => void
  onHome: () => void
  onRefresh: () => void
  onMoved?: (boardId: string) => void
  moderatorKey?: string
}

export function ForumThreadView({
  thread,
  posts,
  displayName,
  songsById,
  pendingSong,
  onClearPendingSong,
  categories,
  onBack,
  onHome,
  onRefresh,
  onMoved,
  moderatorKey,
}: ForumThreadViewProps) {
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveCategoryId, setMoveCategoryId] = useState('')
  const [moveBoardId, setMoveBoardId] = useState('')
  const [moveLoading, setMoveLoading] = useState(false)

  const threadSong = thread.songId ? songsById.get(thread.songId) : undefined

  const moveBoards = useMemo(() => {
    const category = categories.find((c) => c.id === moveCategoryId)
    return category?.boards ?? []
  }, [categories, moveCategoryId])

  const openMovePanel = () => {
    const current = categories.find((c) =>
      c.boards.some((b) => b.id === thread.boardId),
    )
    setMoveCategoryId(current?.id ?? categories[0]?.id ?? '')
    setMoveBoardId('')
    setMoveOpen(true)
    setError('')
  }

  const handleMoveThread = async () => {
    if (!moderatorKey || !moveBoardId) return
    if (moveBoardId === thread.boardId) {
      setError('Bitte einen anderen Unterbereich wählen.')
      return
    }
    setMoveLoading(true)
    setError('')
    try {
      const newBoardId = await forumAdminMoveThread(thread.id, moveBoardId, moderatorKey)
      setMoveOpen(false)
      onMoved?.(newBoardId)
      onRefresh()
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Verschieben fehlgeschlagen.')
    } finally {
      setMoveLoading(false)
    }
  }

  const handleReply = async (e: FormEvent) => {
    e.preventDefault()
    if (thread.isLocked) return
    setError('')
    setLoading(true)
    try {
      await forumCreatePost({
        threadId: thread.id,
        body: body.trim(),
        authorName: displayName,
        songId: pendingSong?.id,
      })
      setBody('')
      onClearPendingSong()
      onRefresh()
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Antwort fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!moderatorKey) return
    if (!window.confirm('Beitrag wirklich löschen?')) return
    setDeletingId(postId)
    try {
      await forumDeletePost(postId, moderatorKey)
      onRefresh()
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Löschen fehlgeschlagen.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <ForumNavBar
        backLabel={`Zurück zu ${thread.boardName}`}
        onBack={onBack}
        onHome={onHome}
      />

      <header className="mb-5">
        <p className="text-xs uppercase tracking-wider text-neutral-600">
          {thread.categoryName} · {thread.boardName}
        </p>
        <h1 className="page-title text-2xl">{thread.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          von {thread.authorName} · {formatForumDate(thread.createdAt)}
        </p>
        {threadSong && (
          <div className="mt-3">
            <ForumSongEmbed song={threadSong} />
          </div>
        )}
        {thread.isLocked && (
          <p className="alert-error mt-3 text-sm">Dieses Thema ist geschlossen.</p>
        )}
        {moderatorKey && (
          <div className="mt-4">
            {!moveOpen ? (
              <button
                type="button"
                onClick={openMovePanel}
                className="btn-secondary !py-2 text-sm"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Thema verschieben
              </button>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="mb-3 text-sm font-medium text-amber-200/90">
                  Thema in anderen Unterbereich verschieben
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={moveCategoryId}
                    onChange={(e) => {
                      setMoveCategoryId(e.target.value)
                      setMoveBoardId('')
                    }}
                    className="input-field !py-2 !text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={moveBoardId}
                    onChange={(e) => setMoveBoardId(e.target.value)}
                    className="input-field !py-2 !text-sm"
                  >
                    <option value="">Unterbereich wählen…</option>
                    {moveBoards.map((b) => (
                      <option key={b.id} value={b.id} disabled={b.id === thread.boardId}>
                        {b.name}
                        {b.id === thread.boardId ? ' (aktuell)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleMoveThread}
                    disabled={moveLoading || !moveBoardId}
                    className="btn-primary !py-2 text-sm"
                  >
                    {moveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verschieben
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveOpen(false)}
                    className="btn-secondary !py-2 text-sm"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {error && <p className="alert-error mb-4 text-sm">{error}</p>}

      <ul className="mb-6 space-y-3">
        {posts.map((post) => {
          const song = post.songId ? songsById.get(post.songId) : undefined
          return (
            <li key={post.id} className="card !p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-lime-300/90">{post.authorName}</p>
                  <p className="text-xs text-neutral-600">{formatForumDate(post.createdAt)}</p>
                </div>
                {moderatorKey && (
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-800 hover:text-red-300"
                    aria-label="Beitrag löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-300">
                {post.body}
              </p>
              {song && (
                <div className="mt-3">
                  <ForumSongEmbed song={song} compact />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {!thread.isLocked && (
        <form onSubmit={handleReply} className="card space-y-4">
          <h2 className="text-sm font-semibold text-neutral-300">Antworten</h2>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 10000))}
            className="input-field min-h-[100px] resize-y"
            placeholder="Deine Antwort…"
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
          <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Antwort senden
          </button>
        </form>
      )}
    </div>
  )
}
