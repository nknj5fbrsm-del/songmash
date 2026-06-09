import { fetchMatchViaApi } from './getMatchApi'
import { loadLocalMatch, matchFromIds } from './pairingSession'
import { getStorageMode } from './repository'
import type { Song, VoteMatch } from '../types/song'

export async function resolveCurrentMatch(
  songs: Song[],
  voteCounts: Map<string, number>,
): Promise<VoteMatch | null> {
  if (getStorageMode() === 'supabase') {
    const { songAId, songBId } = await fetchMatchViaApi()
    if (!songAId || !songBId) return null
    return matchFromIds(songs, songAId, songBId)
  }

  return loadLocalMatch(songs, voteCounts)
}
