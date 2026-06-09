const VOTES_PAGE = 1000

export async function fetchGlobalVoteCounts(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        range: (
          from: number,
          to: number,
        ) => Promise<{
          data: Array<{ song_a_id: string; song_b_id: string }> | null
          error: { message: string } | null
        }>
      }
    }
  },
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('votes')
      .select('song_a_id, song_b_id')
      .range(offset, offset + VOTES_PAGE - 1)

    if (error) throw new Error(error.message)

    const page = data ?? []
    for (const vote of page) {
      counts.set(vote.song_a_id, (counts.get(vote.song_a_id) ?? 0) + 1)
      counts.set(vote.song_b_id, (counts.get(vote.song_b_id) ?? 0) + 1)
    }

    if (page.length < VOTES_PAGE) break
    offset += VOTES_PAGE
  }

  return counts
}
