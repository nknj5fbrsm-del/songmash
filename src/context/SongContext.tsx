import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { MOCK_SONGS } from '../data/mockSongs'
import { CastVoteError } from '../lib/castVoteApi'
import { getSongRepository, getStorageMode } from '../lib/repository'
import { deleteSongByToken as deleteSongByTokenRequest, reloadSongsAfterTokenDelete } from '../lib/deleteSongByToken'
import { incrementUserVoteCount, readUserVoteCount } from '../lib/userVoteProgress'
import { VOTE_LIMITS } from '../lib/voteLimits'
import { computeVoteCounts, incrementVoteCounts } from '../lib/voteCounts'
import {
  applyVoteToWinLoss,
  computeWinLossBySongId,
  type WinLossStats,
} from '../lib/winLossScore'
import {
  advanceLocalMatch,
  clearLocalPairingSession,
  matchFromIds,
} from '../lib/pairingSession'
import { resolveCurrentMatch } from '../lib/resolveMatch'
import type { Song, VoteMatch, VoteRecord, VoteResult } from '../types/song'

function deriveVoteState(votes: VoteRecord[]) {
  return {
    voteCounts: computeVoteCounts(votes),
    winLossBySongId: computeWinLossBySongId(votes),
  }
}

interface SongContextValue {
  songs: Song[]
  currentMatch: VoteMatch | null
  isLoading: boolean
  error: string | null
  storageMode: 'supabase' | 'local'
  voteCounts: Map<string, number>
  winLossBySongId: Map<string, WinLossStats>
  totalVoteRounds: number
  userVoteCount: number
  voteCooldownUntil: number
  vote: (result: VoteResult) => Promise<void>
  submitSong: (
    data: Omit<Song, 'id' | 'eloRating' | 'submissionDate'>,
    deletionTokenHash: string,
  ) => Promise<void>
  deleteSongByToken: (token: string) => Promise<{ title: string }>
  removeSong: (songId: string) => Promise<void>
  refreshMatch: () => void
}

const SongContext = createContext<SongContextValue | null>(null)

export function SongProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => getSongRepository(), [])
  const storageMode = useMemo(() => getStorageMode(), [])

  const [songs, setSongs] = useState<Song[]>([])
  const [voteCounts, setVoteCounts] = useState<Map<string, number>>(() => new Map())
  const [winLossBySongId, setWinLossBySongId] = useState<Map<string, WinLossStats>>(
    () => new Map(),
  )
  const [totalVoteRounds, setTotalVoteRounds] = useState(0)
  const [currentMatch, setCurrentMatch] = useState<VoteMatch | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userVoteCount, setUserVoteCount] = useState(() => readUserVoteCount())
  const [voteCooldownUntil, setVoteCooldownUntil] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadSongs() {
      setIsLoading(true)
      setError(null)

      try {
        await repository.seedIfEmpty(MOCK_SONGS)
        const [loaded, votes, rounds] = await Promise.all([
          repository.getAll(),
          repository.getAllVotes(),
          repository.getVoteRoundCount(),
        ])
        if (cancelled) return

        const { voteCounts: counts, winLossBySongId: winLoss } = deriveVoteState(votes)
        const match = await resolveCurrentMatch(loaded, counts)

        setSongs(loaded)
        setVoteCounts(counts)
        setWinLossBySongId(winLoss)
        setTotalVoteRounds(rounds)
        setCurrentMatch(match)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Songs konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadSongs()
    return () => {
      cancelled = true
    }
  }, [repository])

  const refreshMatch = useCallback(() => {
    void resolveCurrentMatch(songs, voteCounts)
      .then(setCurrentMatch)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Match konnte nicht geladen werden.')
      })
  }, [songs, voteCounts])

  const vote = useCallback(
    async (result: VoteResult) => {
      if (!currentMatch) return
      if (Date.now() < voteCooldownUntil) return

      const { songA, songB } = currentMatch
      const voteCountA = voteCounts.get(songA.id) ?? 0
      const voteCountB = voteCounts.get(songB.id) ?? 0

      try {
        const castResult = await repository.castVote({
          songAId: songA.id,
          songBId: songB.id,
          winner: result,
          ratingA: songA.eloRating,
          ratingB: songB.eloRating,
          voteCountA,
          voteCountB,
        })

        const updated = songs.map((song) => {
          if (song.id === songA.id) return { ...song, eloRating: castResult.newRatingA }
          if (song.id === songB.id) return { ...song, eloRating: castResult.newRatingB }
          return song
        })

        const nextCounts = incrementVoteCounts(voteCounts, songA.id, songB.id)
        setSongs(updated)
        setVoteCounts(nextCounts)
        if (result !== 'skip') {
          setWinLossBySongId((prev) => applyVoteToWinLoss(prev, songA.id, songB.id, result))
        }
        setTotalVoteRounds((n) => n + 1)
        if (result !== 'skip') {
          setUserVoteCount(incrementUserVoteCount())
        }
        setVoteCooldownUntil(Date.now() + VOTE_LIMITS.MIN_INTERVAL_SEC * 1000)
        setError(null)

        if (storageMode === 'supabase') {
          const next =
            castResult.nextSongAId && castResult.nextSongBId
              ? matchFromIds(updated, castResult.nextSongAId, castResult.nextSongBId)
              : null
          setCurrentMatch(next)
        } else {
          setCurrentMatch(advanceLocalMatch(currentMatch, updated, nextCounts))
        }
      } catch (err) {
        if (err instanceof CastVoteError) {
          if (err.code === 'SESSION_MISMATCH') {
            try {
              const match = await resolveCurrentMatch(songs, voteCounts)
              setCurrentMatch(match)
            } catch {
              // ignore resync failure
            }
          }
          setVoteCooldownUntil(Date.now() + err.retryAfterSec * 1000)
          setError(err.message)
          return
        }
        setError(err instanceof Error ? err.message : 'Vote konnte nicht gespeichert werden.')
      }
    },
    [
      currentMatch,
      songs,
      voteCounts,
      voteCooldownUntil,
      repository,
      storageMode,
    ],
  )

  const submitSong = useCallback(
    async (data: Omit<Song, 'id' | 'eloRating' | 'submissionDate'>, deletionTokenHash: string) => {
      try {
        const newSong = await repository.insert(data, deletionTokenHash)
        const updated = [...songs, newSong]
        setSongs(updated)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Song konnte nicht eingereicht werden.')
        throw err
      }
    },
    [songs, repository],
  )

  const deleteSongByToken = useCallback(
    async (token: string) => {
      const result = await deleteSongByTokenRequest(token)
      const { songs: reloaded, voteCounts: counts, winLossBySongId: winLoss, totalVoteRounds: rounds } =
        await reloadSongsAfterTokenDelete()
      if (storageMode === 'local') clearLocalPairingSession()
      const match = await resolveCurrentMatch(reloaded, counts)
      setSongs(reloaded)
      setVoteCounts(counts)
      setWinLossBySongId(winLoss)
      setTotalVoteRounds(rounds)
      setCurrentMatch(match)
      setError(null)
      return result
    },
    [storageMode],
  )

  const removeSong = useCallback(
    async (songId: string) => {
      try {
        const updated = await repository.deleteSongAndRecalculate(songId)
        const [votes, rounds] = await Promise.all([
          repository.getAllVotes(),
          repository.getVoteRoundCount(),
        ])
        const { voteCounts: counts, winLossBySongId: winLoss } = deriveVoteState(votes)
        if (storageMode === 'local') clearLocalPairingSession()
        const match = await resolveCurrentMatch(updated, counts)
        setSongs(updated)
        setVoteCounts(counts)
        setWinLossBySongId(winLoss)
        setTotalVoteRounds(rounds)
        setCurrentMatch(match)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Song konnte nicht gelöscht werden.')
        throw err
      }
    },
    [repository, storageMode],
  )

  const value = useMemo(
    () => ({
      songs,
      currentMatch,
      isLoading,
      error,
      storageMode,
      voteCounts,
      winLossBySongId,
      totalVoteRounds,
      userVoteCount,
      voteCooldownUntil,
      vote,
      submitSong,
      deleteSongByToken,
      removeSong,
      refreshMatch,
    }),
    [
      songs,
      currentMatch,
      isLoading,
      error,
      storageMode,
      voteCounts,
      winLossBySongId,
      totalVoteRounds,
      userVoteCount,
      voteCooldownUntil,
      vote,
      submitSong,
      deleteSongByToken,
      removeSong,
      refreshMatch,
    ],
  )

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>
}

export function useSongs() {
  const ctx = useContext(SongContext)
  if (!ctx) throw new Error('useSongs must be used within SongProvider')
  return ctx
}
