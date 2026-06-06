/** Match-Teilnahmen (wie voteCounts, inkl. Skip), ab denen Boost/K-Faktor auslaufen. */
export const PROVISIONAL_VOTE_THRESHOLD = 15

export const ELO_K_FACTOR = 32
export const ELO_K_FACTOR_PROVISIONAL = 40

export function kFactorForVoteCount(voteCount: number): number {
  return voteCount < PROVISIONAL_VOTE_THRESHOLD ? ELO_K_FACTOR_PROVISIONAL : ELO_K_FACTOR
}

/** Höheres Gewicht → häufiger im Zufalls-Match, solange unter der Schwelle. */
export function exposureWeightForVoteCount(voteCount: number): number {
  if (voteCount >= PROVISIONAL_VOTE_THRESHOLD) return 1
  return 1 + (PROVISIONAL_VOTE_THRESHOLD - voteCount) / PROVISIONAL_VOTE_THRESHOLD
}

export function pairExposureWeight(
  songAId: string,
  songBId: string,
  voteCounts: Map<string, number>,
): number {
  const a = voteCounts.get(songAId) ?? 0
  const b = voteCounts.get(songBId) ?? 0
  return exposureWeightForVoteCount(a) + exposureWeightForVoteCount(b)
}
