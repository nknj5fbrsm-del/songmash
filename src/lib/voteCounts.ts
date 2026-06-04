import type { VoteRecord } from '../types/song'

export function computeVoteCounts(votes: VoteRecord[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const vote of votes) {
    counts.set(vote.songAId, (counts.get(vote.songAId) ?? 0) + 1)
    counts.set(vote.songBId, (counts.get(vote.songBId) ?? 0) + 1)
  }
  return counts
}

export function incrementVoteCounts(
  counts: Map<string, number>,
  songAId: string,
  songBId: string,
): Map<string, number> {
  const next = new Map(counts)
  next.set(songAId, (next.get(songAId) ?? 0) + 1)
  next.set(songBId, (next.get(songBId) ?? 0) + 1)
  return next
}

/** Eine Zeile in `votes` = eine Abstimmungsrunde (A/B/Skip). */
export function totalVoteRoundsFromCounts(counts: Map<string, number>): number {
  return Math.floor([...counts.values()].reduce((sum, count) => sum + count, 0) / 2)
}
