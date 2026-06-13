import { useMemo, useState, type FormEvent } from 'react'
import { ArrowRightLeft, Loader2, Lock, LockOpen, Pin, PinOff, Pencil, Trash2, X } from 'lucide-react'
import { ForumNavBar } from './ForumNavBar'
import {
  ForumApiError,
  forumAdminDeleteThread,
  forumAdminLockThread,
  forumAdminMoveThread,
  forumAdminPinThread,
  forumCreatePost,
  forumDeletePost,
  forumUpdatePost,
} from '../../lib/forumApi'
import { formatForumDate } from '../../lib/forumFormat'
import type { ForumCategory, ForumPendingAttachments, ForumPost, ForumThreadDetail } from '../../types/forum'
import type { Song } from '../../types/song'
import { ForumAttachmentDisplay } from './ForumAttachmentDisplay'
import { ForumAttachmentPicker } from './ForumAttachmentPicker'
import { ForumPostBody } from './ForumPostBody'
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
  onThreadDeleted?: () => void
  moderatorUnlocked?: boolean
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
  onThreadDeleted,
  moderatorUnlocked,
}: ForumThreadViewProps) {
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<ForumPendingAttachments>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveCategoryId, setMoveCategoryId] = useState('')
  const [moveBoardId, setMoveBoardId] = useState('')
  const [moveLoading, setMoveLoading] = useState(false)
  const [modActionLoading, setModActionLoading] = useState(false)

  const canReply = !thread.isLocked || !!moderatorUnlocked
  const canModeratePosts = !thread.isLocked || !!moderatorUnlocked

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
    if (!moderatorUnlocked || !moveBoardId) return
    if (moveBoardId === thread.boardId) {
      setError('Bitte einen anderen Unterbereich wählen.')
      return
    }
    setMoveLoading(true)
    setError('')
    try {
      const newBoardId = await forumAdminMoveThread(thread.id, moveBoardId)
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
    if (!canReply) return
    setError('')
    setLoading(true)
    try {
      await forumCreatePost({
        threadId: thread.id,
        body: body.trim(),
        authorName: displayName,
        songId: pendingSong?.id,
        imageUrl: attachments.imageUrl,
        audioUrl: attachments.audioUrl,
      })
      setBody('')
      setAttachments({})
      onClearPendingSong()
      onRefresh()
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Antwort fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  const canModifyPost = (post: ForumPost) =>
    post.authorName === displayName || !!moderatorUnlocked

  const startEdit = (post: ForumPost) => {
    setEditingPostId(post.id)
    setEditBody(post.body)
    setError('')
  }

  const cancelEdit = () => {
    setEditingPostId(null)
    setEditBody('')
  }

  const handleSaveEdit = async (post: ForumPost) => {
    if (!canModifyPost(post) || !canModeratePosts) return
    setEditLoading(true)
    setError('')
    try {
      await forumUpdatePost({
        postId: post.id,
        body: editBody.trim(),
        authorName: displayName,
      })
      cancelEdit()
      onRefresh()
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (post: ForumPost) => {
    if (!canModifyPost(post)) return
    if (!window.confirm('Beitrag wirklich löschen?')) return
    setDeletingId(post.id)
    setError('')
    try {
      const result = await forumDeletePost({
        postId: post.id,
        authorName: displayName,
      })
      if (result.threadDeleted) {
        onThreadDeleted?.()
      } else {
        onRefresh()
      }
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Löschen fehlgeschlagen.')
    } finally {
      setDeletingId(null)
    }
  }

  const runModAction = async (fn: () => Promise<void>) => {
    setModActionLoading(true)
    setError('')
    try {
      await fn()
      onRefresh()
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Aktion fehlgeschlagen.')
    } finally {
      setModActionLoading(false)
    }
  }

  const handleToggleLock = () => {
    void runModAction(() => forumAdminLockThread(thread.id, !thread.isLocked))
  }

  const handleTogglePin = () => {
    void runModAction(() => forumAdminPinThread(thread.id, !thread.isPinned))
  }

  const handleDeleteThread = async () => {
    if (
      !window.confirm(
        'Gesamtes Thema mit allen Beiträgen und Anhängen unwiderruflich löschen?',
      )
    ) {
      return
    }
    setModActionLoading(true)
    setError('')
    try {
      await forumAdminDeleteThread(thread.id)
      onThreadDeleted?.()
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Löschen fehlgeschlagen.')
      setModActionLoading(false)
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
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {thread.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
              <Pin className="h-3 w-3" />
              Angepinnt
            </span>
          )}
          {thread.isLocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
              <Lock className="h-3 w-3" />
              Geschlossen
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          von {thread.authorName} · {formatForumDate(thread.createdAt)}
        </p>
        {thread.isLocked && !moderatorUnlocked && (
          <p className="alert-error mt-3 text-sm">Dieses Thema ist geschlossen.</p>
        )}
        {moderatorUnlocked && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleToggleLock}
                disabled={modActionLoading}
                className="btn-secondary !py-2 text-sm"
              >
                {modActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : thread.isLocked ? (
                  <LockOpen className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {thread.isLocked ? 'Thema öffnen' : 'Thema schließen'}
              </button>
              <button
                type="button"
                onClick={handleTogglePin}
                disabled={modActionLoading}
                className="btn-secondary !py-2 text-sm"
              >
                {modActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : thread.isPinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
                {thread.isPinned ? 'Lösen' : 'Anpinnen'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!moveOpen) openMovePanel()
                  else setMoveOpen(false)
                }}
                disabled={modActionLoading}
                className="btn-secondary !py-2 text-sm"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Verschieben
              </button>
              <button
                type="button"
                onClick={handleDeleteThread}
                disabled={modActionLoading}
                className="btn-secondary !py-2 text-sm text-red-300 hover:text-red-200"
              >
                <Trash2 className="h-4 w-4" />
                Thema löschen
              </button>
            </div>
            {moveOpen && (
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
                    onClick={() => {
                      setMoveOpen(false)
                      setMoveBoardId('')
                    }}
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
          const isEditing = editingPostId === post.id
          const showActions = canModifyPost(post) && (moderatorUnlocked || !thread.isLocked)
          return (
            <li key={post.id} className="card !p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-lime-300/90">{post.authorName}</p>
                  <p className="text-xs text-neutral-600">{formatForumDate(post.createdAt)}</p>
                </div>
                {showActions && !isEditing && (
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      onClick={() => startEdit(post)}
                      className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-800 hover:text-lime-300"
                      aria-label="Beitrag bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      disabled={deletingId === post.id}
                      className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-800 hover:text-red-300"
                      aria-label="Beitrag löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value.slice(0, 10000))}
                    className="input-field min-h-[100px] resize-y text-sm"
                    autoFocus
                  />
                  {song && (
                    <div>
                      <ForumSongEmbed song={song} compact />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(post)}
                      disabled={editLoading || editBody.trim().length < 1}
                      className="btn-primary !py-2 text-sm"
                    >
                      {editLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Speichern
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={editLoading}
                      className="btn-secondary !py-2 text-sm"
                    >
                      <X className="h-4 w-4" />
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <ForumPostBody text={post.body} />
                  <ForumAttachmentDisplay imageUrl={post.imageUrl} audioUrl={post.audioUrl} />
                  {song && (
                    <div className="mt-3">
                      <ForumSongEmbed song={song} compact />
                    </div>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>

      {canReply && (
        <form onSubmit={handleReply} className="card space-y-4">
          <h2 className="text-sm font-semibold text-neutral-300">
            {thread.isLocked && moderatorUnlocked ? 'Antworten (Moderator)' : 'Antworten'}
          </h2>
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
          <ForumAttachmentPicker
            attachments={attachments}
            onChange={setAttachments}
            disabled={loading}
          />
          <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Antwort senden
          </button>
        </form>
      )}
    </div>
  )
}
