import type { Song, VoteMatch } from '../types/song'

export function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`
}

export interface PickMatchOptions {
  /** Songs aus dem gerade beendeten Match — nicht im nächsten Match. */
  excludeSongIds?: string[]
  /** Paar-Keys (normalisiert), die noch nicht wieder kommen dürfen. */
  excludePairKeys?: string[]
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

function pickRandomCandidate(candidates: VoteMatch[]): VoteMatch {
  const chosen = candidates[Math.floor(Math.random() * candidates.length)]
  if (Math.random() < 0.5) return chosen
  return { songA: chosen.songB, songB: chosen.songA }
}

export function pickRandomMatch(songs: Song[], options?: PickMatchOptions): VoteMatch | null {
  if (songs.length < 2) return null

  const excludeSongs = new Set(options?.excludeSongIds ?? [])
  const excludePairs = new Set(options?.excludePairKeys ?? [])
  const pairs = allPairs(songs)

  const strict = filterCandidates(pairs, excludeSongs, excludePairs, true, true)
  if (strict.length > 0) return pickRandomCandidate(strict)

  const noSongBan = filterCandidates(pairs, excludeSongs, excludePairs, false, true)
  if (noSongBan.length > 0) return pickRandomCandidate(noSongBan)

  if (pairs.length > 0) return pickRandomCandidate(pairs)

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

export function pairingOptionsFromState(state: {
  excludeSongIds: string[]
  bannedPairs: BannedPair[]
}): PickMatchOptions {
  return {
    excludeSongIds: state.excludeSongIds,
    excludePairKeys: state.bannedPairs.map((b) => b.key),
  }
}
