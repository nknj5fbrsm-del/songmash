import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { MOCK_SONGS } from '../data/mockSongs'
import { calculateElo } from '../lib/elo'
import {
  advancePairBans,
  pickRandomMatch,
  pairingOptionsFromState,
  type BannedPair,
} from '../lib/match'
import { getSongRepository, getStorageMode } from '../lib/repository'
import { deleteSongByToken as deleteSongByTokenRequest, reloadSongsAfterTokenDelete } from '../lib/deleteSongByToken'
import { incrementUserVoteCount, readUserVoteCount } from '../lib/userVoteProgress'
import { computeVoteCounts, incrementVoteCounts } from '../lib/voteCounts'
import type { Song, VoteMatch, VoteResult } from '../types/song'

interface SongContextValue {
  songs: Song[]
  currentMatch: VoteMatch | null
  isLoading: boolean
  error: string | null
  storageMode: 'supabase' | 'local'
  voteCounts: Map<string, number>
  totalVoteRounds: number
  userVoteCount: number
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
  const [totalVoteRounds, setTotalVoteRounds] = useState(0)
  const [currentMatch, setCurrentMatch] = useState<VoteMatch | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userVoteCount, setUserVoteCount] = useState(() => readUserVoteCount())

  const pairingRef = useRef<{ excludeSongIds: string[]; bannedPairs: BannedPair[] }>({
    excludeSongIds: [],
    bannedPairs: [],
  })

  const pickNextMatch = useCallback((songList: Song[]) => {
    return pickRandomMatch(songList, pairingOptionsFromState(pairingRef.current))
  }, [])

  const finishMatchAndPickNext = useCallback(
    (finished: VoteMatch, songList: Song[]) => {
      const state = pairingRef.current
      state.bannedPairs = advancePairBans(state.bannedPairs, finished)
      state.excludeSongIds = [finished.songA.id, finished.songB.id]
      return pickNextMatch(songList)
    },
    [pickNextMatch],
  )

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

        setSongs(loaded)
        setVoteCounts(computeVoteCounts(votes))
        setTotalVoteRounds(rounds)
        setCurrentMatch(pickRandomMatch(loaded))
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
    setCurrentMatch(pickNextMatch(songs))
  }, [songs, pickNextMatch])

  const vote = useCallback(
    async (result: VoteResult) => {
      if (!currentMatch) return

      if (result === 'skip') {
        const finished = currentMatch
        await repository.recordVote(finished.songA.id, finished.songB.id, 'skip')
        setVoteCounts((counts) =>
          incrementVoteCounts(counts, finished.songA.id, finished.songB.id),
        )
        setTotalVoteRounds((n) => n + 1)
        setCurrentMatch(finishMatchAndPickNext(finished, songs))
        return
      }

      const { songA, songB } = currentMatch
      const { newRatingA, newRatingB } = calculateElo(
        songA.eloRating,
        songB.eloRating,
        result,
      )

      try {
        await repository.updateEloRatings(songA.id, newRatingA, songB.id, newRatingB)
        await repository.recordVote(songA.id, songB.id, result)

        const updated = songs.map((song) => {
          if (song.id === songA.id) return { ...song, eloRating: newRatingA }
          if (song.id === songB.id) return { ...song, eloRating: newRatingB }
          return song
        })

        setSongs(updated)
        setVoteCounts((counts) => incrementVoteCounts(counts, songA.id, songB.id))
        setTotalVoteRounds((n) => n + 1)
        setUserVoteCount(incrementUserVoteCount())
        setCurrentMatch(finishMatchAndPickNext(currentMatch, updated))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Vote konnte nicht gespeichert werden.')
      }
    },
    [currentMatch, songs, repository, finishMatchAndPickNext],
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
      const { songs: reloaded, voteCounts: counts, totalVoteRounds: rounds } =
        await reloadSongsAfterTokenDelete()
      setSongs(reloaded)
      setVoteCounts(counts)
      setTotalVoteRounds(rounds)
      setCurrentMatch(pickNextMatch(reloaded))
      setError(null)
      return result
    },
    [pickNextMatch],
  )

  const removeSong = useCallback(
    async (songId: string) => {
      try {
        const updated = await repository.deleteSongAndRecalculate(songId)
        const [votes, rounds] = await Promise.all([
          repository.getAllVotes(),
          repository.getVoteRoundCount(),
        ])
        setSongs(updated)
        setVoteCounts(computeVoteCounts(votes))
        setTotalVoteRounds(rounds)
        setCurrentMatch(pickNextMatch(updated))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Song konnte nicht gelöscht werden.')
        throw err
      }
    },
    [repository, pickNextMatch],
  )

  const value = useMemo(
    () => ({
      songs,
      currentMatch,
      isLoading,
      error,
      storageMode,
      voteCounts,
      totalVoteRounds,
      userVoteCount,
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
      totalVoteRounds,
      userVoteCount,
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
