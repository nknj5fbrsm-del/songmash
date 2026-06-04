import {
  formatWeekCountdown,
  getBerlinWeekNumber,
  getCurrentBerlinWeekBounds,
} from './competitionWeek'
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import type { HallOfFameWeek, CompetitionWeek, WeekWinner } from '../types/weekCompetition'
import type { Song } from '../types/song'

type WeekRow = {
  id: string
  starts_at: string
  ends_at: string
  status: string
}

type WinnerRow = {
  id: string
  week_id: string
  winner_type: string
  song_id: string | null
  song_title: string
  song_artist: string
  final_elo: number | null
  elo_delta: number | null
  final_rank: number | null
  week_vote_count: number | null
}

type SnapshotRow = {
  song_id: string
  elo_at_start: number
}

function mapWeek(row: WeekRow): CompetitionWeek {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status as CompetitionWeek['status'],
  }
}

function mapWinner(row: WinnerRow): WeekWinner {
  return {
    id: row.id,
    weekId: row.week_id,
    winnerType: row.winner_type as WeekWinner['winnerType'],
    songId: row.song_id,
    songTitle: row.song_title,
    songArtist: row.song_artist,
    finalElo: row.final_elo,
    eloDelta: row.elo_delta,
    finalRank: row.final_rank,
    weekVoteCount: row.week_vote_count,
  }
}

export async function triggerWeekCycle(): Promise<void> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!baseUrl || !anonKey) return

  try {
    await fetch(`${baseUrl}/functions/v1/week-cycle`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
    })
  } catch {
    // Hintergrund-Sync; Fehler ignorieren
  }
}

export async function fetchActiveWeek(): Promise<CompetitionWeek | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('competition_weeks')
    .select('*')
    .eq('status', 'active')
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapWeek(data as WeekRow) : null
}

export async function fetchWeekSnapshots(weekId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!isSupabaseConfigured()) return map

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('week_elo_snapshots')
    .select('song_id, elo_at_start')
    .eq('week_id', weekId)

  if (error) throw new Error(error.message)
  for (const row of (data ?? []) as SnapshotRow[]) {
    map.set(row.song_id, row.elo_at_start)
  }
  return map
}

export async function fetchWeekVotesInRange(
  startsAt: string,
  endsAt: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (!isSupabaseConfigured()) return counts

  const supabase = getSupabaseClient()
  const pageSize = 1000
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('votes')
      .select('song_a_id, song_b_id, created_at')
      .gte('created_at', startsAt)
      .lte('created_at', endsAt)
      .range(offset, offset + pageSize - 1)

    if (error) throw new Error(error.message)
    const page = data ?? []
    for (const row of page) {
      const a = row.song_a_id as string
      const b = row.song_b_id as string
      counts.set(a, (counts.get(a) ?? 0) + 1)
      counts.set(b, (counts.get(b) ?? 0) + 1)
    }
    if (page.length < pageSize) break
    offset += pageSize
  }

  return counts
}

export async function fetchHallOfFame(limit = 8): Promise<HallOfFameWeek[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = getSupabaseClient()
  const { data: weeks, error } = await supabase
    .from('competition_weeks')
    .select('*')
    .eq('status', 'finalized')
    .order('starts_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  if (!weeks?.length) return []

  const weekIds = weeks.map((w) => (w as WeekRow).id)
  const { data: winners, error: winErr } = await supabase
    .from('week_winners')
    .select('*')
    .in('week_id', weekIds)

  if (winErr) throw new Error(winErr.message)

  const winnersByWeek = new Map<string, WeekWinner[]>()
  for (const row of (winners ?? []) as WinnerRow[]) {
    const list = winnersByWeek.get(row.week_id) ?? []
    list.push(mapWinner(row))
    winnersByWeek.set(row.week_id, list)
  }

  return (weeks as WeekRow[]).map((row) => ({
    week: mapWeek(row),
    winners: winnersByWeek.get(row.id) ?? [],
  }))
}

export function getLeaderFromSongs(songs: Song[]): Song | null {
  if (songs.length === 0) return null
  return [...songs].sort((a, b) => b.eloRating - a.eloRating)[0]
}

export function buildWeekDisplayState(
  week: CompetitionWeek | null,
  now = new Date(),
): {
  weekNumber: number
  countdownLabel: string
  msRemaining: number
  isEnded: boolean
} {
  const endsAt = week ? new Date(week.endsAt) : getCurrentBerlinWeekBounds(now).endsAt
  const startsAt = week ? new Date(week.startsAt) : getCurrentBerlinWeekBounds(now).startsAt
  const msRemaining = endsAt.getTime() - now.getTime()

  return {
    weekNumber: getBerlinWeekNumber(startsAt),
    countdownLabel: formatWeekCountdown(msRemaining),
    msRemaining,
    isEnded: msRemaining <= 0,
  }
}

export function isWeekCompetitionAvailable(): boolean {
  return isSupabaseConfigured()
}
