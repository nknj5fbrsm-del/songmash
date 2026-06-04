import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Song } from '../types/song'
import type { CompetitionWeek, HallOfFameWeek } from '../types/weekCompetition'
import { computeLiveMvpCandidate } from '../lib/weekFinalize'
import {
  buildWeekDisplayState,
  fetchActiveWeek,
  fetchHallOfFame,
  fetchWeekSnapshots,
  fetchWeekVotesInRange,
  getLeaderFromSongs,
  isWeekCompetitionAvailable,
  triggerWeekCycle,
} from '../lib/weekCompetition'

export function useWeekCompetition(songs: Song[], voteActivityKey = 0) {
  const enabled = isWeekCompetitionAvailable()
  const [activeWeek, setActiveWeek] = useState<CompetitionWeek | null>(null)
  const [snapshots, setSnapshots] = useState<Map<string, number>>(new Map())
  const [weekVoteCounts, setWeekVoteCounts] = useState<Map<string, number>>(new Map())
  const [hallOfFame, setHallOfFame] = useState<HallOfFameWeek[]>([])
  const [now, setNow] = useState(() => new Date())
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const loadWeekData = useCallback(async () => {
    const [week, fame] = await Promise.all([fetchActiveWeek(), fetchHallOfFame()])
      setActiveWeek(week)
      setHallOfFame(fame)

      if (week) {
        const [snaps, votes] = await Promise.all([
          fetchWeekSnapshots(week.id),
          fetchWeekVotesInRange(week.startsAt, week.endsAt),
        ])
        setSnapshots(snaps)
        setWeekVoteCounts(votes)
      } else {
        setSnapshots(new Map())
        setWeekVoteCounts(new Map())
      }
  }, [])

  const refresh = useCallback(
    async (runCycle: boolean) => {
      if (!enabled) {
        setLoading(false)
        return
      }

      setError(null)
      try {
        if (runCycle) await triggerWeekCycle()
        await loadWeekData()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Wochenwettbewerb konnte nicht geladen werden.')
      } finally {
        setLoading(false)
      }
    },
    [enabled, loadWeekData],
  )

  const cycleSynced = useRef(false)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    refresh(!cycleSynced.current)
    cycleSynced.current = true
  }, [enabled, refresh])

  useEffect(() => {
    if (!enabled || !cycleSynced.current) return
    void refresh(false)
  }, [enabled, refresh, songs.length, voteActivityKey])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const display = useMemo(() => buildWeekDisplayState(activeWeek, now), [activeWeek, now])

  const currentLeader = useMemo(() => getLeaderFromSongs(songs), [songs])

  const mvpCandidate = useMemo(
    () => computeLiveMvpCandidate(songs, snapshots, weekVoteCounts),
    [songs, snapshots, weekVoteCounts],
  )

  return {
    enabled,
    loading,
    error,
    activeWeek,
    display,
    currentLeader,
    mvpCandidate,
    hallOfFame,
    refresh: () => refresh(true),
  }
}
