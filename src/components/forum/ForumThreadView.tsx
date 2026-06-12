import { useState, type FormEvent } from 'react'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { ForumApiError, forumCreatePost, forumDeletePost } from '../../lib/forumApi'
import { formatForumDate } from '../../lib/forumFormat'
import type { ForumPost, ForumThreadDetail } from '../../types/forum'
import type { Song } from '../../types/song'
import { ForumSongEmbed } from './ForumSongEmbed'

interface ForumThreadViewProps {
  thread: ForumThreadDetail
  posts: ForumPost[]
  displayName: string
  songsById: Map<string, Song>
  pendingSong: Song | null
  onClearPendingSong: () => void
  onBack: () => void
  onRefresh: () => void
  moderatorKey?: string
}

export function ForumThreadView({
  thread,
  posts,
  displayName,
  songsById,
  pendingSong,
  onClearPendingSong,
  onBack,
  onRefresh,
  moderatorKey,
}: ForumThreadViewProps) {
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const threadSong = thread.songId ? songsById.get(thread.songId) : undefined

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
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {thread.boardName}
      </button>

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
      </header>

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
          {error && <p className="alert-error text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Antwort senden
          </button>
        </form>
      )}
    </div>
  )
}
