import { useCallback, useEffect, useMemo, useState } from 'react'
import { Library, Loader2, LogOut, Pencil } from 'lucide-react'
import { useSongs } from '../../context/SongContext'
import { useModerator } from '../../hooks/useModerator'
import {
  ForumApiError,
  forumFetchStructure,
  forumFetchThread,
  forumFetchThreads,
  isForumConfigured,
} from '../../lib/forumApi'
import {
  clearForumSession,
  readForumDisplayName,
  readForumSession,
  writeForumDisplayName,
} from '../../lib/forumStorage'
import type { ForumBoardDetail, ForumCategory, ForumPost, ForumThreadDetail, ForumThreadSummary } from '../../types/forum'
import type { Song } from '../../types/song'
import { ForumAdminPanel } from './ForumAdminPanel'
import { ForumBoardView } from './ForumBoardView'
import { ForumDisplayNamePrompt } from './ForumDisplayNamePrompt'
import { ForumGate } from './ForumGate'
import { ForumHome } from './ForumHome'
import { ForumSongLibrary } from './ForumSongLibrary'
import { ForumThreadView } from './ForumThreadView'

type ForumView = 'home' | 'board' | 'thread'

export function ForumPage() {
  const { songs } = useSongs()
  const { unlocked: moderatorUnlocked } = useModerator()
  const moderatorKey = import.meta.env.VITE_MODERATOR_KEY as string | undefined

  const [hasSession, setHasSession] = useState(() => Boolean(readForumSession()))
  const [displayName, setDisplayName] = useState(() => readForumDisplayName())
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)

  const [view, setView] = useState<ForumView>('home')
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [boardDetail, setBoardDetail] = useState<ForumBoardDetail | null>(null)
  const [threads, setThreads] = useState<ForumThreadSummary[]>([])
  const [threadDetail, setThreadDetail] = useState<ForumThreadDetail | null>(null)
  const [posts, setPosts] = useState<ForumPost[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [pendingSong, setPendingSong] = useState<Song | null>(null)
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])

  const loadStructure = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await forumFetchStructure()
      setCategories(data)
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Forum konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBoard = useCallback(async (boardId: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await forumFetchThreads(boardId)
      setBoardDetail(data.board)
      setThreads(data.threads)
      setView('board')
      setActiveBoardId(boardId)
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Themen konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadThread = useCallback(async (threadId: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await forumFetchThread(threadId)
      setThreadDetail(data.thread)
      setPosts(data.posts)
      setView('thread')
      setActiveThreadId(threadId)
      setActiveBoardId(data.thread.boardId)
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Thema konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasSession && displayName) {
      void loadStructure()
    }
  }, [hasSession, displayName, loadStructure])

  const handleLogout = () => {
    clearForumSession()
    setHasSession(false)
    setView('home')
    setCategories([])
    setBoardDetail(null)
    setThreads([])
    setThreadDetail(null)
    setPosts([])
  }

  const handleSelectSong = (song: Song) => {
    setPendingSong(song)
    setLibraryOpen(false)
  }

  const saveDisplayName = () => {
    const trimmed = nameDraft.trim()
    if (trimmed.length < 2 || trimmed.length > 32) return
    writeForumDisplayName(trimmed)
    setDisplayName(trimmed)
    setEditingName(false)
  }

  if (!isForumConfigured()) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-neutral-400">
        Forum ist noch nicht konfiguriert (Supabase + Deploy nötig).
      </div>
    )
  }

  if (!hasSession) {
    return <ForumGate onSuccess={() => setHasSession(true)} />
  }

  if (!displayName) {
    return <ForumDisplayNamePrompt onComplete={setDisplayName} />
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title text-2xl">Community-Forum</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            {editingName ? (
              <>
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value.slice(0, 32))}
                  className="input-field !inline-block !w-auto !py-1 !text-sm"
                />
                <button type="button" onClick={saveDisplayName} className="text-lime-400 hover:text-lime-300">
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(displayName)
                    setEditingName(false)
                  }}
                  className="text-neutral-600 hover:text-neutral-400"
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <>
                <span>
                  Angemeldet als <span className="text-neutral-300">{displayName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-400"
                >
                  <Pencil className="h-3 w-3" />
                  Name ändern
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLibraryOpen((v) => !v)}
            className="btn-secondary !py-2 lg:hidden"
          >
            <Library className="h-4 w-4" />
            Bibliothek
          </button>
          <button type="button" onClick={handleLogout} className="btn-secondary !py-2">
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </div>
      </header>

      {error && <p className="alert-error mb-4 text-sm">{error}</p>}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className={`${libraryOpen ? 'block' : 'hidden'} lg:block lg:w-72 lg:shrink-0`}>
          <ForumSongLibrary
            selectedSongId={pendingSong?.id}
            onSelectSong={handleSelectSong}
            onClose={() => setLibraryOpen(false)}
            className="lg:sticky lg:top-24"
          />
        </div>

        <div className="min-w-0 flex-1">
          {loading && (
            <div className="mb-4 flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
              Lädt…
            </div>
          )}

          {view === 'home' && moderatorUnlocked && moderatorKey && (
            <ForumAdminPanel
              categories={categories}
              moderatorKey={moderatorKey}
              onChanged={() => void loadStructure()}
            />
          )}

          {view === 'home' && (
            <ForumHome
              categories={categories}
              onOpenBoard={(boardId) => void loadBoard(boardId)}
            />
          )}

          {view === 'board' && boardDetail && (
            <ForumBoardView
              board={boardDetail}
              threads={threads}
              displayName={displayName}
              songsById={songsById}
              pendingSong={pendingSong}
              onClearPendingSong={() => setPendingSong(null)}
              onBack={() => {
                setView('home')
                setBoardDetail(null)
                void loadStructure()
              }}
              onOpenThread={(threadId) => void loadThread(threadId)}
              onCreated={(threadId) => void loadThread(threadId)}
            />
          )}

          {view === 'thread' && threadDetail && (
            <ForumThreadView
              thread={threadDetail}
              posts={posts}
              displayName={displayName}
              songsById={songsById}
              pendingSong={pendingSong}
              onClearPendingSong={() => setPendingSong(null)}
              onBack={() => {
                if (activeBoardId) void loadBoard(activeBoardId)
              }}
              onRefresh={() => {
                if (activeThreadId) void loadThread(activeThreadId)
              }}
              moderatorKey={moderatorUnlocked ? moderatorKey : undefined}
            />
          )}
        </div>
      </div>
    </div>
  )
}
