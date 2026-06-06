import { ELO_K_FACTOR, kFactorForVoteCount } from './provisionalFairness.ts'

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export function calculateElo(
  ratingA: number,
  ratingB: number,
  winner: 'A' | 'B',
  voteCountA?: number,
  voteCountB?: number,
): { newRatingA: number; newRatingB: number } {
  const ea = expectedScore(ratingA, ratingB)
  const eb = expectedScore(ratingB, ratingA)
  const actualA = winner === 'A' ? 1 : 0
  const actualB = winner === 'B' ? 1 : 0

  const kA = voteCountA !== undefined ? kFactorForVoteCount(voteCountA) : ELO_K_FACTOR
  const kB = voteCountB !== undefined ? kFactorForVoteCount(voteCountB) : ELO_K_FACTOR

  return {
    newRatingA: Math.round(ratingA + kA * (actualA - ea)),
    newRatingB: Math.round(ratingB + kB * (actualB - eb)),
  }
}

export const DEFAULT_ELO = 1500

type VoteRow = {
  song_a_id: string
  song_b_id: string
  winner: string
  created_at: string
}

export function recalculateEloFromVoteRows(
  songIds: string[],
  votes: VoteRow[],
): Map<string, number> {
  const ratings = new Map<string, number>()
  const participation = new Map<string, number>()
  for (const id of songIds) {
    ratings.set(id, DEFAULT_ELO)
    participation.set(id, 0)
  }

  const sorted = [...votes].sort((a, b) => a.created_at.localeCompare(b.created_at))

  for (const vote of sorted) {
    if (!ratings.has(vote.song_a_id) || !ratings.has(vote.song_b_id)) continue

    const countA = participation.get(vote.song_a_id) ?? 0
    const countB = participation.get(vote.song_b_id) ?? 0

    if (vote.winner !== 'skip') {
      const ratingA = ratings.get(vote.song_a_id)!
      const ratingB = ratings.get(vote.song_b_id)!
      const { newRatingA, newRatingB } = calculateElo(
        ratingA,
        ratingB,
        vote.winner as 'A' | 'B',
        countA,
        countB,
      )
      ratings.set(vote.song_a_id, newRatingA)
      ratings.set(vote.song_b_id, newRatingB)
    }

    participation.set(vote.song_a_id, countA + 1)
    participation.set(vote.song_b_id, countB + 1)
  }

  return ratings
}
