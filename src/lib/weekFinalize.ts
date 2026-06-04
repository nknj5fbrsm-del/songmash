import { MIN_WEEK_VOTES_FOR_MVP } from './competitionWeek'
import { DEFAULT_ELO } from './recalculateElo'
import type { Song } from '../types/song'

export function computeLiveMvpCandidate(
  songs: Song[],
  snapshots: Map<string, number>,
  weekVoteCounts: Map<string, number>,
): { song: Song; eloDelta: number; weekVotes: number } | null {
  let best: { song: Song; eloDelta: number; weekVotes: number } | null = null

  for (const song of songs) {
    const weekVotes = weekVoteCounts.get(song.id) ?? 0
    if (weekVotes < MIN_WEEK_VOTES_FOR_MVP) continue

    const startElo = snapshots.get(song.id) ?? DEFAULT_ELO
    const eloDelta = song.eloRating - startElo

    if (
      !best ||
      eloDelta > best.eloDelta ||
      (eloDelta === best.eloDelta && weekVotes > best.weekVotes)
    ) {
      best = { song, eloDelta, weekVotes }
    }
  }

  return best
}
