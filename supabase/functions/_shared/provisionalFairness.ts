export const PROVISIONAL_VOTE_THRESHOLD = 15

export const ELO_K_FACTOR = 32
export const ELO_K_FACTOR_PROVISIONAL = 40

export function kFactorForVoteCount(voteCount: number): number {
  return voteCount < PROVISIONAL_VOTE_THRESHOLD ? ELO_K_FACTOR_PROVISIONAL : ELO_K_FACTOR
}
