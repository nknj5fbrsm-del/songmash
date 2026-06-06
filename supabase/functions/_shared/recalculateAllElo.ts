import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { recalculateEloFromVoteRows } from './elo.ts'

export async function recalculateAllSongElo(supabase: SupabaseClient): Promise<void> {
  const { data: remainingSongs, error: songsError } = await supabase.from('songs').select('id')
  if (songsError) throw songsError

  const votes: { song_a_id: string; song_b_id: string; winner: string; created_at: string }[] =
    []
  const pageSize = 1000
  let offset = 0

  while (true) {
    const { data: page, error: votesError } = await supabase
      .from('votes')
      .select('song_a_id, song_b_id, winner, created_at')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (votesError) throw votesError

    const rows = page ?? []
    votes.push(...rows)

    if (rows.length < pageSize) break
    offset += pageSize
  }

  const songIds = (remainingSongs ?? []).map((s) => s.id)
  const ratings = recalculateEloFromVoteRows(songIds, votes)

  const updates = [...ratings.entries()].map(([id, elo_rating]) =>
    supabase.from('songs').update({ elo_rating }).eq('id', id),
  )
  await Promise.all(updates)
}
