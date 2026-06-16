import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  readForumIsMember,
  readForumSession,
  writeForumDisplayName,
} from '../../lib/forumStorage'
import {
  markForumBoardVisited,
  markForumThreadRead,
} from '../../lib/forumReadStorage'
import {
  parseForumHash,
  setForumHash,
} from '../../lib/forumHashRoute'
import type { ForumBoardDetail, ForumCategory, ForumPinnedBoard, ForumPinnedThread, ForumPost, ForumThreadDetail, ForumThreadSummary } from '../../types/forum'
import type { Song } from '../../types/song'
import { ForumAdminPanel } from './ForumAdminPanel'
import { ForumBoardView } from './ForumBoardView'
import { ForumDisplayNamePrompt } from './ForumDisplayNamePrompt'
import { ForumGate } from './ForumGate'
import { ForumHome } from './ForumHome'
import { ForumSongLibrary } from './ForumSongLibrary'
import { ForumThreadView } from './ForumThreadView'
import { ForumLoungeSheet } from './ForumLoungeSheet'
import { ForumStickyNav } from './ForumStickyNav'

type ForumView = 'home' | 'board' | 'thread'

export function ForumPage() {
  const { songs } = useSongs()
  const { unlocked: moderatorUnlocked } = useModerator()

  const [hasSession, setHasSession] = useState(() => Boolean(readForumSession()))
  const [displayName, setDisplayName] = useState(() => readForumDisplayName())
  const [isMemberLogin, setIsMemberLogin] = useState(() => readForumIsMember())
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)

  const [view, setView] = useState<ForumView>('home')
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [pinnedBoards, setPinnedBoards] = useState<ForumPinnedBoard[]>([])
  const [pinnedThreads, setPinnedThreads] = useState<ForumPinnedThread[]>([])
  const [boardDetail, setBoardDetail] = useState<ForumBoardDetail | null>(null)
  const [threads, setThreads] = useState<ForumThreadSummary[]>([])
  const [threadDetail, setThreadDetail] = useState<ForumThreadDetail | null>(null)
  const [posts, setPosts] = useState<ForumPost[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
  const [pendingSong, setPendingSong] = useState<Song | null>(null)
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [readRevision, setReadRevision] = useState(0)
  const [loungeOpen, setLoungeOpen] = useState(false)

  const viewRef = useRef(view)
  const activeBoardIdRef = useRef(activeBoardId)
  const activeThreadIdRef = useRef(activeThreadId)
  viewRef.current = view
  activeBoardIdRef.current = activeBoardId
  activeThreadIdRef.current = activeThreadId

  const bumpReadRevision = useCallback(() => {
    setReadRevision((n) => n + 1)
  }, [])

  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])

  const loadStructure = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await forumFetchStructure()
      setCategories(data.categories)
      setPinnedBoards(data.pinnedBoards)
      setPinnedThreads(data.pinnedThreads)
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Forum konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBoardInternal = useCallback(async (boardId: string): Promise<boolean> => {
    setLoading(true)
    setError('')
    try {
      const data = await forumFetchThreads(boardId)
      setBoardDetail(data.board)
      setThreads(data.threads)
      setView('board')
      setActiveBoardId(boardId)
      setThreadDetail(null)
      setPosts([])
      setActiveThreadId(null)
      markForumBoardVisited(boardId)
      bumpReadRevision()
      return true
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Themen konnten nicht geladen werden.')
      return false
    } finally {
      setLoading(false)
    }
  }, [bumpReadRevision])

  const loadThreadInternal = useCallback(async (threadId: string): Promise<boolean> => {
    setLoading(true)
    setError('')
    try {
      const data = await forumFetchThread(threadId)
      setThreadDetail(data.thread)
      setPosts(data.posts)
      setView('thread')
      setActiveThreadId(threadId)
      setActiveBoardId(data.thread.boardId)
      markForumThreadRead(threadId, data.thread.updatedAt)
      bumpReadRevision()
      return true
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Thema konnte nicht geladen werden.')
      return false
    } finally {
      setLoading(false)
    }
  }, [bumpReadRevision])

  const navigateBoard = useCallback(
    (boardId: string) => {
      void loadBoardInternal(boardId).then((ok) => {
        if (ok) setForumHash({ view: 'board', boardId })
      })
    },
    [loadBoardInternal],
  )

  const navigateThread = useCallback(
    (threadId: string) => {
      void loadThreadInternal(threadId).then((ok) => {
        if (ok) setForumHash({ view: 'thread', threadId })
      })
    },
    [loadThreadInternal],
  )

  const goHomeInternal = useCallback(() => {
    setView('home')
    setBoardDetail(null)
    setThreads([])
    setThreadDetail(null)
    setPosts([])
    setActiveBoardId(null)
    setActiveThreadId(null)
    void loadStructure()
  }, [loadStructure])

  const navigateHome = useCallback(() => {
    goHomeInternal()
    setForumHash({ view: 'home' })
  }, [goHomeInternal])

  useEffect(() => {
    if (hasSession && displayName) {
      void loadStructure()
    }
  }, [hasSession, displayName, loadStructure])

  useEffect(() => {
    if (!hasSession || !displayName) return

    const syncFromHash = () => {
      const route = parseForumHash(window.location.hash)
      const currentView = viewRef.current
      const currentBoardId = activeBoardIdRef.current
      const currentThreadId = activeThreadIdRef.current

      if (route.view === 'home') {
        if (currentView !== 'home') goHomeInternal()
        return
      }
      if (route.view === 'board') {
        if (currentView === 'board' && currentBoardId === route.boardId) return
        void loadBoardInternal(route.boardId)
        return
      }
      if (currentView === 'thread' && currentThreadId === route.threadId) return
      void loadThreadInternal(route.threadId)
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [hasSession, displayName, goHomeInternal, loadBoardInternal, loadThreadInternal])

  const handleLogout = () => {
    clearForumSession()
    setHasSession(false)
    setIsMemberLogin(false)
    goHomeInternal()
    setCategories([])
    setPinnedBoards([])
    setPinnedThreads([])
    setForumHash({ view: 'home' }, true)
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
    return (
      <ForumGate
        onSuccess={(nameFromLogin) => {
          if (nameFromLogin) {
            setDisplayName(nameFromLogin)
            setIsMemberLogin(true)
          } else {
            setIsMemberLogin(readForumIsMember())
          }
          setHasSession(true)
        }}
      />
    )
  }

  if (!displayName) {
    return <ForumDisplayNamePrompt onComplete={setDisplayName} />
  }

  return (
    <div className="pb-24">
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
                {!isMemberLogin && (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-400"
                  >
                    <Pencil className="h-3 w-3" />
                    Name ändern
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!libraryOpen && (
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="btn-secondary !py-2"
            >
              <Library className="h-4 w-4" />
              Bibliothek
            </button>
          )}
          <button type="button" onClick={handleLogout} className="btn-secondary !py-2">
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </div>
      </header>

      {error && <p className="alert-error mb-4 text-sm">{error}</p>}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className={`${libraryOpen ? 'block' : 'hidden'} lg:w-72 lg:shrink-0`}>
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

          {view === 'home' && moderatorUnlocked && (
            <ForumAdminPanel
              categories={categories}
              onChanged={() => void loadStructure()}
            />
          )}

          {view === 'home' && (
            <ForumHome
              categories={categories}
              pinnedBoards={pinnedBoards}
              pinnedThreads={pinnedThreads}
              readRevision={readRevision}
              onOpenBoard={navigateBoard}
              onOpenThread={navigateThread}
            />
          )}

          {view === 'board' && boardDetail && (
            <ForumBoardView
              board={boardDetail}
              threads={threads}
              readRevision={readRevision}
              displayName={displayName}
              songsById={songsById}
              pendingSong={pendingSong}
              onClearPendingSong={() => setPendingSong(null)}
              onBack={navigateHome}
              onHome={navigateHome}
              onOpenThread={navigateThread}
              onCreated={navigateThread}
            />
          )}

          {view === 'thread' && threadDetail && (
            <ForumThreadView
              thread={threadDetail}
              posts={posts}
              categories={categories}
              displayName={displayName}
              songsById={songsById}
              pendingSong={pendingSong}
              onClearPendingSong={() => setPendingSong(null)}
              onBack={() => {
                if (activeBoardId) navigateBoard(activeBoardId)
              }}
              onHome={navigateHome}
              onRefresh={() => {
                if (activeThreadId) void loadThreadInternal(activeThreadId)
              }}
              onMoved={(boardId) => {
                setActiveBoardId(boardId)
                void loadStructure()
                if (activeThreadId) setForumHash({ view: 'thread', threadId: activeThreadId })
              }}
              onThreadDeleted={() => {
                setThreadDetail(null)
                setPosts([])
                setActiveThreadId(null)
                if (activeBoardId) navigateBoard(activeBoardId)
              }}
              moderatorUnlocked={moderatorUnlocked}
            />
          )}
        </div>
      </div>

      <ForumStickyNav
        backLabel={
          view === 'thread' && threadDetail
            ? `Zurück zu ${threadDetail.boardName}`
            : 'Zurück zur Übersicht'
        }
        onBack={() => {
          if (view === 'board') navigateHome()
          else if (view === 'thread' && activeBoardId) navigateBoard(activeBoardId)
        }}
        onHome={navigateHome}
        onChat={() => setLoungeOpen((v) => !v)}
        chatOpen={loungeOpen}
        backDisabled={view === 'home'}
        homeDisabled={view === 'home'}
      />

      <ForumLoungeSheet
        open={loungeOpen}
        onClose={() => setLoungeOpen(false)}
        displayName={displayName}
        moderatorUnlocked={moderatorUnlocked}
      />
    </div>
  )
}
