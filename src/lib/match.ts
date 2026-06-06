import { pairExposureWeight } from './provisionalFairness'
import type { Song, VoteMatch } from '../types/song'

export function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`
}

export interface PickMatchOptions {
  /** Songs aus dem gerade beendeten Match — nicht im nächsten Match. */
  excludeSongIds?: string[]
  /** Paar-Keys (normalisiert), die noch nicht wieder kommen dürfen. */
  excludePairKeys?: string[]
  /** Globale Match-Teilnahmen pro Song (inkl. Skip) für Neuling-Boost. */
  voteCounts?: Map<string, number>
}

export const PAIR_BAN_ROUNDS = 3

function allPairs(songs: Song[]): VoteMatch[] {
  const pairs: VoteMatch[] = []
  for (let i = 0; i < songs.length; i++) {
    for (let j = i + 1; j < songs.length; j++) {
      pairs.push({ songA: songs[i], songB: songs[j] })
    }
  }
  return pairs
}

function filterCandidates(
  pairs: VoteMatch[],
  excludeSongs: Set<string>,
  excludePairs: Set<string>,
  skipSongRule: boolean,
  skipPairRule: boolean,
): VoteMatch[] {
  return pairs.filter(({ songA, songB }) => {
    if (skipPairRule && excludePairs.has(pairKey(songA.id, songB.id))) return false
    if (skipSongRule && (excludeSongs.has(songA.id) || excludeSongs.has(songB.id))) {
      return false
    }
    return true
  })
}

function maybeSwapSides(match: VoteMatch): VoteMatch {
  if (Math.random() < 0.5) return match
  return { songA: match.songB, songB: match.songA }
}

function pickRandomCandidate(candidates: VoteMatch[], voteCounts?: Map<string, number>): VoteMatch {
  if (candidates.length === 0) {
    throw new Error('pickRandomCandidate requires at least one candidate')
  }

  if (!voteCounts || candidates.length === 1) {
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]
    return maybeSwapSides(chosen)
  }

  const weights = candidates.map((match) =>
    pairExposureWeight(match.songA.id, match.songB.id, voteCounts),
  )
  const total = weights.reduce((sum, w) => sum + w, 0)
  let roll = Math.random() * total

  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return maybeSwapSides(candidates[i])
  }

  return maybeSwapSides(candidates[candidates.length - 1])
}

export function pickRandomMatch(songs: Song[], options?: PickMatchOptions): VoteMatch | null {
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

export function advancePairBans(bannedPairs: BannedPair[], finishedMatch: VoteMatch): BannedPair[] {
  const key = pairKey(finishedMatch.songA.id, finishedMatch.songB.id)
  const next = bannedPairs
    .map((b) => ({ ...b, roundsLeft: b.roundsLeft - 1 }))
    .filter((b) => b.roundsLeft > 0)
  next.push({ key, roundsLeft: PAIR_BAN_ROUNDS })
  return next
}

export function pairingOptionsFromState(
  state: {
    excludeSongIds: string[]
    bannedPairs: BannedPair[]
  },
  voteCounts?: Map<string, number>,
): PickMatchOptions {
  return {
    excludeSongIds: state.excludeSongIds,
    excludePairKeys: state.bannedPairs.map((b) => b.key),
    voteCounts,
  }
}
