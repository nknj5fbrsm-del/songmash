import { calculateElo } from './elo'
import type { Song, VoteRecord } from '../types/song'

export const DEFAULT_ELO = 1500

export function recalculateEloRatings(
  songs: Song[],
  votes: VoteRecord[],
): Map<string, number> {
  const ratings = new Map<string, number>()
  for (const song of songs) {
    ratings.set(song.id, DEFAULT_ELO)
  }

  const sorted = [...votes].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  for (const vote of sorted) {
    if (vote.winner === 'skip') continue
    if (!ratings.has(vote.songAId) || !ratings.has(vote.songBId)) continue

    const ratingA = ratings.get(vote.songAId)!
    const ratingB = ratings.get(vote.songBId)!
    const { newRatingA, newRatingB } = calculateElo(ratingA, ratingB, vote.winner)
    ratings.set(vote.songAId, newRatingA)
    ratings.set(vote.songBId, newRatingB)
  }

  return ratings
}

export function applyEloRatings(songs: Song[], ratings: Map<string, number>): Song[] {
  return songs.map((song) => ({
    ...song,
    eloRating: ratings.get(song.id) ?? DEFAULT_ELO,
  }))
}
