import { pairExposureWeight } from './provisionalFairness.ts'

export function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`
}

export type SongRef = { id: string }

export type PickedMatch = { songAId: string; songBId: string }

export interface PickMatchOptions {
  excludeSongIds?: string[]
  excludePairKeys?: string[]
  voteCounts?: Map<string, number>
}

export const PAIR_BAN_ROUNDS = 3

function allPairs(songs: SongRef[]): Array<{ songAId: string; songBId: string }> {
  const pairs: Array<{ songAId: string; songBId: string }> = []
  for (let i = 0; i < songs.length; i++) {
    for (let j = i + 1; j < songs.length; j++) {
      pairs.push({ songAId: songs[i].id, songBId: songs[j].id })
    }
  }
  return pairs
}

function filterCandidates(
  pairs: Array<{ songAId: string; songBId: string }>,
  excludeSongs: Set<string>,
  excludePairs: Set<string>,
  skipSongRule: boolean,
  skipPairRule: boolean,
): Array<{ songAId: string; songBId: string }> {
  return pairs.filter(({ songAId, songBId }) => {
    if (skipPairRule && excludePairs.has(pairKey(songAId, songBId))) return false
    if (skipSongRule && (excludeSongs.has(songAId) || excludeSongs.has(songBId))) {
      return false
    }
    return true
  })
}

function maybeSwapSides(match: { songAId: string; songBId: string }): PickedMatch {
  if (Math.random() < 0.5) return match
  return { songAId: match.songBId, songBId: match.songAId }
}

function pickRandomCandidate(
  candidates: Array<{ songAId: string; songBId: string }>,
  voteCounts?: Map<string, number>,
): PickedMatch {
  if (candidates.length === 0) {
    throw new Error('pickRandomCandidate requires at least one candidate')
  }

  if (!voteCounts || candidates.length === 1) {
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]
    return maybeSwapSides(chosen)
  }

  const weights = candidates.map((match) =>
    pairExposureWeight(match.songAId, match.songBId, voteCounts),
  )
  const total = weights.reduce((sum, w) => sum + w, 0)
  let roll = Math.random() * total

  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return maybeSwapSides(candidates[i])
  }

  return maybeSwapSides(candidates[candidates.length - 1])
}

export function pickRandomMatch(songs: SongRef[], options?: PickMatchOptions): PickedMatch | null {
  if (songs.length < 2) return null

  const excludeSongs = new Set(options?.excludeSongIds ?? [])
  const excludePairs = new Set(options?.excludePairKeys ?? [])
  const voteCounts = options?.voteCounts
  const pairs = allPairs(songs)

  const strict = filterCandidates(pairs, excludeSongs, excludePairs, true, true)
  if (strict.length > 0) return pickRandomCandidate(strict, voteCounts)

  const noSongBan = filterCandidates(pairs, excludeSongs, excludePairs, false, true)
  if (noSongBan.length > 0) return pickRandomCandidate(noSongBan, voteCounts)

  if (pairs.length > 0) return pickRandomCandidate(pairs, voteCounts)

  return null
}

export type BannedPair = { key: string; roundsLeft: number }

export function advancePairBans(bannedPairs: BannedPair[], finished: PickedMatch): BannedPair[] {
  const key = pairKey(finished.songAId, finished.songBId)
  const next = bannedPairs
    .map((b) => ({ ...b, roundsLeft: b.roundsLeft - 1 }))
    .filter((b) => b.roundsLeft > 0)
  next.push({ key, roundsLeft: PAIR_BAN_ROUNDS })
  return next
}

export function pairingOptionsFromState(
  state: { excludeSongIds: string[]; bannedPairs: BannedPair[] },
  voteCounts?: Map<string, number>,
): PickMatchOptions {
  return {
    excludeSongIds: state.excludeSongIds,
    excludePairKeys: state.bannedPairs.map((b) => b.key),
    voteCounts,
  }
}
