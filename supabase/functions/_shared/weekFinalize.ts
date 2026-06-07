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

function compareForLeaderboardRank(
  a: SongRow,
  b: SongRow,
  eloA: number,
  eloB: number,
  voteCounts: Map<string, number>,
): number {
  if (eloB !== eloA) return eloB - eloA
  const votesA = voteCounts.get(a.id) ?? 0
  const votesB = voteCounts.get(b.id) ?? 0
  if (votesB !== votesA) return votesB - votesA
  return a.submission_date.localeCompare(b.submission_date)
}

function buildRankMap(
  songs: SongRow[],
  getElo: (song: SongRow) => number,
  voteCounts: Map<string, number>,
): Map<string, number> {
  const sorted = [...songs].sort((a, b) =>
    compareForLeaderboardRank(a, b, getElo(a), getElo(b), voteCounts),
  )
  const ranks = new Map<string, number>()
  sorted.forEach((song, index) => ranks.set(song.id, index + 1))
  return ranks
}

export function computeWeekWinners(
  songs: SongRow[],
  snapshots: SnapshotRow[],
  voteCounts: Map<string, number>,
): WinnerInsert[] {
  if (songs.length === 0) return []

  const snapshotMap = new Map(snapshots.map((s) => [s.song_id, s.elo_at_start]))
  const withSnapshot = songs.filter((song) => snapshotMap.has(song.id))

  const ranked = [...songs].sort((a, b) =>
    compareForLeaderboardRank(a, b, a.elo_rating, b.elo_rating, voteCounts),
  )

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

  if (withSnapshot.length === 0) return winners

  const startRanks = buildRankMap(
    withSnapshot,
    (song) => snapshotMap.get(song.id)!,
    voteCounts,
  )
  const currentRanks = buildRankMap(
    withSnapshot,
    (song) => song.elo_rating,
    voteCounts,
  )

  let bestMvp: (WinnerInsert & { rankJump: number }) | null = null

  for (const song of withSnapshot) {
    const weekVotes = voteCounts.get(song.id) ?? 0
    if (weekVotes < MIN_WEEK_VOTES_FOR_MVP) continue

    const startRank = startRanks.get(song.id)!
    const currentRank = currentRanks.get(song.id)!
    const rankJump = startRank - currentRank

    if (rankJump <= 0) continue

    const candidate: WinnerInsert & { rankJump: number } = {
      winner_type: 'weekly_mvp',
      song_id: song.id,
      song_title: song.title,
      song_artist: song.artist,
      final_elo: song.elo_rating,
      elo_delta: rankJump,
      final_rank: currentRank,
      week_vote_count: weekVotes,
      rankJump,
    }

    if (
      !bestMvp ||
      candidate.rankJump > bestMvp.rankJump ||
      (candidate.rankJump === bestMvp.rankJump &&
        candidate.week_vote_count > bestMvp.week_vote_count)
    ) {
      bestMvp = candidate
    }
  }

  if (bestMvp) {
    const { rankJump: _r, ...mvp } = bestMvp
    winners.push(mvp)
  }

  return winners
}
