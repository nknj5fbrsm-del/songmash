export const ELO_K_FACTOR = 32
const K_FACTOR = ELO_K_FACTOR

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export interface EloUpdate {
  newRatingA: number
  newRatingB: number
}

export function calculateElo(
  ratingA: number,
  ratingB: number,
  winner: 'A' | 'B',
): EloUpdate {
  const ea = expectedScore(ratingA, ratingB)
  const eb = expectedScore(ratingB, ratingA)

  const actualA = winner === 'A' ? 1 : 0
  const actualB = winner === 'B' ? 1 : 0

  return {
    newRatingA: Math.round(ratingA + K_FACTOR * (actualA - ea)),
    newRatingB: Math.round(ratingB + K_FACTOR * (actualB - eb)),
  }
}
