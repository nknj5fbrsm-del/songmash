import type { Song, VoteMatch } from '../types/song'

export function pickRandomMatch(songs: Song[]): VoteMatch | null {
  if (songs.length < 2) return null

  const shuffled = [...songs].sort(() => Math.random() - 0.5)
  return { songA: shuffled[0], songB: shuffled[1] }
}
