import {
  advancePairBans,
  pickRandomMatch,
  pairingOptionsFromState,
  type BannedPair,
  type PickedMatch,
  type SongRef,
} from './match.ts'

export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000

export type PairingState = {
  excludeSongIds: string[]
  bannedPairs: BannedPair[]
}

export type VoterSessionRow = {
  voter_id: string
  song_a_id: string
  song_b_id: string
  exclude_song_ids: string[]
  banned_pairs: BannedPair[]
  updated_at: string
}

export function sessionPairingState(row: VoterSessionRow): PairingState {
  return {
    excludeSongIds: row.exclude_song_ids ?? [],
    bannedPairs: row.banned_pairs ?? [],
  }
}

export function sessionIsExpired(updatedAt: string, now = Date.now()): boolean {
  return now - new Date(updatedAt).getTime() > SESSION_MAX_AGE_MS
}

export function sessionMatchesVote(row: VoterSessionRow, songAId: string, songBId: string): boolean {
  return row.song_a_id === songAId && row.song_b_id === songBId
}

export function sessionSongsExist(row: VoterSessionRow, songIds: Set<string>): boolean {
  return songIds.has(row.song_a_id) && songIds.has(row.song_b_id)
}

export async function loadVoterSession(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          maybeSingle: () => Promise<{
            data: VoterSessionRow | null
            error: { message: string } | null
          }>
        }
      }
    }
  },
  voterId: string,
): Promise<VoterSessionRow | null> {
  const { data, error } = await supabase
    .from('voter_match_sessions')
    .select('voter_id, song_a_id, song_b_id, exclude_song_ids, banned_pairs, updated_at')
    .eq('voter_id', voterId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function saveVoterSession(
  supabase: {
    from: (table: string) => {
      upsert: (
        row: Record<string, unknown>,
        opts: { onConflict: string },
      ) => Promise<{ error: { message: string } | null }>
    }
  },
  voterId: string,
  match: PickedMatch,
  pairing: PairingState,
): Promise<void> {
  const { error } = await supabase.from('voter_match_sessions').upsert(
    {
      voter_id: voterId,
      song_a_id: match.songAId,
      song_b_id: match.songBId,
      exclude_song_ids: pairing.excludeSongIds,
      banned_pairs: pairing.bannedPairs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'voter_id' },
  )
  if (error) throw new Error(error.message)
}

export function advancePairingAfterVote(
  pairing: PairingState,
  finished: PickedMatch,
): PairingState {
  return {
    bannedPairs: advancePairBans(pairing.bannedPairs, finished),
    excludeSongIds: [finished.songAId, finished.songBId],
  }
}

export function pickNextMatchForSongs(
  songs: SongRef[],
  pairing: PairingState,
  voteCounts: Map<string, number>,
): PickedMatch | null {
  return pickRandomMatch(songs, pairingOptionsFromState(pairing, voteCounts))
}

export async function resolveVoterMatch(
  supabase: Parameters<typeof loadVoterSession>[0] & Parameters<typeof saveVoterSession>[0],
  voterId: string,
  songs: SongRef[],
  voteCounts: Map<string, number>,
): Promise<PickedMatch | null> {
  if (songs.length < 2) {
    return null
  }

  const songIds = new Set(songs.map((s) => s.id))
  const existing = await loadVoterSession(supabase, voterId)

  if (
    existing &&
    !sessionIsExpired(existing.updated_at) &&
    sessionSongsExist(existing, songIds)
  ) {
    return { songAId: existing.song_a_id, songBId: existing.song_b_id }
  }

  const pairing: PairingState = { excludeSongIds: [], bannedPairs: [] }
  const match = pickNextMatchForSongs(songs, pairing, voteCounts)
  if (!match) return null

  await saveVoterSession(supabase, voterId, match, pairing)
  return match
}
