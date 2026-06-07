import { MIN_WEEK_VOTES_FOR_MVP } from './competitionWeek'
import type { Song } from '../types/song'

export type MvpCandidate = {
  song: Song
  rankJump: number
  startRank: number
  currentRank: number
  weekVotes: number
}

function compareForLeaderboardRank(
  a: Song,
  b: Song,
  eloA: number,
  eloB: number,
  weekVoteCounts: Map<string, number>,
): number {
  if (eloB !== eloA) return eloB - eloA
  const votesA = weekVoteCounts.get(a.id) ?? 0
  const votesB = weekVoteCounts.get(b.id) ?? 0
  if (votesB !== votesA) return votesB - votesA
  return a.submissionDate.localeCompare(b.submissionDate)
}

function buildRankMap(
  songs: Song[],
  getElo: (song: Song) => number,
  weekVoteCounts: Map<string, number>,
): Map<string, number> {
  const sorted = [...songs].sort((a, b) =>
    compareForLeaderboardRank(a, b, getElo(a), getElo(b), weekVoteCounts),
  )
  const ranks = new Map<string, number>()
  sorted.forEach((song, index) => ranks.set(song.id, index + 1))
  return ranks
}

export function computeLiveMvpCandidate(
  songs: Song[],
  snapshots: Map<string, number>,
  weekVoteCounts: Map<string, number>,
): MvpCandidate | null {
  const withSnapshot = songs.filter((song) => snapshots.has(song.id))
  if (withSnapshot.length === 0) return null

  const startRanks = buildRankMap(
    withSnapshot,
    (song) => snapshots.get(song.id)!,
    weekVoteCounts,
  )
  const currentRanks = buildRankMap(
    withSnapshot,
    (song) => song.eloRating,
    weekVoteCounts,
  )

  let best: MvpCandidate | null = null

  for (const song of withSnapshot) {
    const weekVotes = weekVoteCounts.get(song.id) ?? 0
    if (weekVotes < MIN_WEEK_VOTES_FOR_MVP) continue

    const startRank = startRanks.get(song.id)!
    const currentRank = currentRanks.get(song.id)!
    const rankJump = startRank - currentRank

    if (rankJump <= 0) continue

    if (
      !best ||
      rankJump > best.rankJump ||
      (rankJump === best.rankJump && weekVotes > best.weekVotes)
    ) {
      best = { song, rankJump, startRank, currentRank, weekVotes }
    }
  }

  return best
}
