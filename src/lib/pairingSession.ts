import {
  advancePairBans,
  pickRandomMatch,
  pairingOptionsFromState,
  type BannedPair,
} from './match'
import type { Song, VoteMatch } from '../types/song'

const STORAGE_KEY = 'songmash_pairing_session'

type StoredPairingSession = {
  songAId: string
  songBId: string
  excludeSongIds: string[]
  bannedPairs: BannedPair[]
}

function readRaw(): StoredPairingSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPairingSession
    if (!parsed.songAId || !parsed.songBId) return null
    return parsed
  } catch {
    return null
  }
}

function writeRaw(session: StoredPairingSession | null): void {
  try {
    if (!session) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // ignore
  }
}

export function matchFromIds(songs: Song[], songAId: string, songBId: string): VoteMatch | null {
  const songA = songs.find((s) => s.id === songAId)
  const songB = songs.find((s) => s.id === songBId)
  if (!songA || !songB) return null
  return { songA, songB }
}

export function loadLocalMatch(
  songs: Song[],
  voteCounts: Map<string, number>,
): VoteMatch | null {
  const stored = readRaw()
  if (stored) {
    const restored = matchFromIds(songs, stored.songAId, stored.songBId)
    if (restored) return restored
  }

  const match = pickRandomMatch(songs, { voteCounts })
  if (!match) return null

  writeRaw({
    songAId: match.songA.id,
    songBId: match.songB.id,
    excludeSongIds: [],
    bannedPairs: [],
  })
  return match
}

export function advanceLocalMatch(
  finished: VoteMatch,
  songs: Song[],
  voteCounts: Map<string, number>,
): VoteMatch | null {
  const stored = readRaw() ?? {
    songAId: finished.songA.id,
    songBId: finished.songB.id,
    excludeSongIds: [],
    bannedPairs: [],
  }

  const bannedPairs = advancePairBans(stored.bannedPairs, finished)
  const excludeSongIds = [finished.songA.id, finished.songB.id]
  const next = pickRandomMatch(
    songs,
    pairingOptionsFromState({ excludeSongIds, bannedPairs }, voteCounts),
  )

  if (!next) {
    writeRaw(null)
    return null
  }

  writeRaw({
    songAId: next.songA.id,
    songBId: next.songB.id,
    excludeSongIds,
    bannedPairs,
  })
  return next
}

export function clearLocalPairingSession(): void {
  writeRaw(null)
}
