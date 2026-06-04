import { MIN_WEEK_VOTES_FOR_MVP } from './competitionWeek.ts'

const DEFAULT_ELO = 1500

export type SongRow = {
  id: string
  title: string
  artist: string
  elo_rating: number
  submission_date: string
}

export type VoteRow = {
  song_a_id: string
  song_b_id: string
  winner: string
  created_at: string
}

export type SnapshotRow = {
  song_id: string
  elo_at_start: number
}

export type WinnerInsert = {
  winner_type: 'leaderboard_champion' | 'weekly_mvp'
  song_id: string
  song_title: string
  song_artist: string
  final_elo: number
  elo_delta: number | null
  final_rank: number
  week_vote_count: number
}

export function countVotesInWeek(
  votes: VoteRow[],
  startsAt: string,
  endsAt: string,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const vote of votes) {
    if (vote.created_at < startsAt || vote.created_at > endsAt) continue
    counts.set(vote.song_a_id, (counts.get(vote.song_a_id) ?? 0) + 1)
    counts.set(vote.song_b_id, (counts.get(vote.song_b_id) ?? 0) + 1)
  }
  return counts
}

export function computeWeekWinners(
  songs: SongRow[],
  snapshots: SnapshotRow[],
  voteCounts: Map<string, number>,
): WinnerInsert[] {
  if (songs.length === 0) return []

  const snapshotMap = new Map(snapshots.map((s) => [s.song_id, s.elo_at_start]))

  const ranked = [...songs].sort((a, b) => {
    if (b.elo_rating !== a.elo_rating) return b.elo_rating - a.elo_rating
    const votesA = voteCounts.get(a.id) ?? 0
    const votesB = voteCounts.get(b.id) ?? 0
    if (votesB !== votesA) return votesB - votesA
    return a.submission_date.localeCompare(b.submission_date)
  })

  const champion = ranked[0]
  const championVotes = voteCounts.get(champion.id) ?? 0

  const winners: WinnerInsert[] = [
    {
      winner_type: 'leaderboard_champion',
      song_id: champion.id,
      song_title: champion.title,
      song_artist: champion.artist,
      final_elo: champion.elo_rating,
      elo_delta: champion.elo_rating - (snapshotMap.get(champion.id) ?? DEFAULT_ELO),
      final_rank: 1,
      week_vote_count: championVotes,
    },
  ]

  let bestMvp: (WinnerInsert & { delta: number }) | null = null

  for (const song of songs) {
    const weekVotes = voteCounts.get(song.id) ?? 0
    if (weekVotes < MIN_WEEK_VOTES_FOR_MVP) continue

    const startElo = snapshotMap.get(song.id) ?? DEFAULT_ELO
    const delta = song.elo_rating - startElo
    const rank = ranked.findIndex((s) => s.id === song.id) + 1

    const candidate: WinnerInsert & { delta: number } = {
      winner_type: 'weekly_mvp',
      song_id: song.id,
      song_title: song.title,
      song_artist: song.artist,
      final_elo: song.elo_rating,
      elo_delta: delta,
      final_rank: rank,
      week_vote_count: weekVotes,
      delta,
    }

    if (
      !bestMvp ||
      candidate.delta > bestMvp.delta ||
      (candidate.delta === bestMvp.delta && candidate.week_vote_count > bestMvp.week_vote_count)
    ) {
      bestMvp = candidate
    }
  }

  if (bestMvp) {
    const { delta: _d, ...mvp } = bestMvp
    winners.push(mvp)
  }

  return winners
}
