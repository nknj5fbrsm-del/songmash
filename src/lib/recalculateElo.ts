import { calculateElo } from './elo'
import type { Song, VoteRecord } from '../types/song'

export const DEFAULT_ELO = 1500

export function recalculateEloRatings(
  songs: Song[],
  votes: VoteRecord[],
): Map<string, number> {
  const ratings = new Map<string, number>()
  const participation = new Map<string, number>()
  for (const song of songs) {
    ratings.set(song.id, DEFAULT_ELO)
    participation.set(song.id, 0)
  }

  const sorted = [...votes].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  for (const vote of sorted) {
    if (!ratings.has(vote.songAId) || !ratings.has(vote.songBId)) continue

    const countA = participation.get(vote.songAId) ?? 0
    const countB = participation.get(vote.songBId) ?? 0

    if (vote.winner !== 'skip') {
      const ratingA = ratings.get(vote.songAId)!
      const ratingB = ratings.get(vote.songBId)!
      const { newRatingA, newRatingB } = calculateElo(ratingA, ratingB, vote.winner, {
        voteCountA: countA,
        voteCountB: countB,
      })
      ratings.set(vote.songAId, newRatingA)
      ratings.set(vote.songBId, newRatingB)
    }

    participation.set(vote.songAId, countA + 1)
    participation.set(vote.songBId, countB + 1)
  }

  return ratings
}

export function applyEloRatings(songs: Song[], ratings: Map<string, number>): Song[] {
  return songs.map((song) => ({
    ...song,
    eloRating: ratings.get(song.id) ?? DEFAULT_ELO,
  }))
}
