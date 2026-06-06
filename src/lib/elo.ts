import { ELO_K_FACTOR, kFactorForVoteCount } from './provisionalFairness'

export { ELO_K_FACTOR, ELO_K_FACTOR_PROVISIONAL } from './provisionalFairness'

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export interface EloUpdate {
  newRatingA: number
  newRatingB: number
}

export interface EloVoteContext {
  voteCountA: number
  voteCountB: number
}

export function calculateElo(
  ratingA: number,
  ratingB: number,
  winner: 'A' | 'B',
  context?: EloVoteContext,
): EloUpdate {
  const ea = expectedScore(ratingA, ratingB)
  const eb = expectedScore(ratingB, ratingA)

  const actualA = winner === 'A' ? 1 : 0
  const actualB = winner === 'B' ? 1 : 0

  const kA = context ? kFactorForVoteCount(context.voteCountA) : ELO_K_FACTOR
  const kB = context ? kFactorForVoteCount(context.voteCountB) : ELO_K_FACTOR

  return {
    newRatingA: Math.round(ratingA + kA * (actualA - ea)),
    newRatingB: Math.round(ratingB + kB * (actualB - eb)),
  }
}
