import type { CastVoteResult } from './castVoteApi'
import type { Song, VoteRecord, VoteResult } from '../types/song'

export type CastVoteParams = {
  songAId: string
  songBId: string
  winner: VoteResult
  ratingA: number
  ratingB: number
  voteCountA: number
  voteCountB: number
}
import { isSupabaseConfigured } from './supabaseClient'
import { setDeletionHash } from './localDeletionHashes'
import { calculateElo } from './elo'
import { localSongRepository } from './storage'
import { supabaseSongRepository } from './supabaseStorage'

export interface SongRepository {
  getAll(): Promise<Song[]>
  insert(
    data: Omit<Song, 'id' | 'eloRating' | 'submissionDate'>,
    deletionTokenHash: string,
  ): Promise<Song>
  updateEloRatings(
    songAId: string,
    newRatingA: number,
    songBId: string,
    newRatingB: number,
  ): Promise<void>
  castVote(params: CastVoteParams): Promise<CastVoteResult>
  getAllVotes(): Promise<VoteRecord[]>
  getVoteRoundCount(): Promise<number>
  seedIfEmpty(seedSongs: Song[]): Promise<void>
  deleteSongAndRecalculate(songId: string): Promise<Song[]>
}

const localAsyncRepository: SongRepository = {
  async getAll() {
    return localSongRepository.getAll()
  },

  async insert(data, deletionTokenHash) {
    const song: Song = {
      ...data,
      id: crypto.randomUUID(),
      eloRating: 1500,
      submissionDate: new Date().toISOString(),
    }
    localSongRepository.add(song)
    setDeletionHash(song.id, deletionTokenHash)
    return song
  },

  async updateEloRatings(songAId, newRatingA, songBId, newRatingB) {
    const songs = localSongRepository.getAll().map((song) => {
      if (song.id === songAId) return { ...song, eloRating: newRatingA }
      if (song.id === songBId) return { ...song, eloRating: newRatingB }
      return song
    })
    localSongRepository.saveAll(songs)
  },

  async castVote({
    songAId,
    songBId,
    winner,
    ratingA,
    ratingB,
    voteCountA,
    voteCountB,
  }: CastVoteParams): Promise<CastVoteResult> {
    if (winner === 'skip') {
      return {
        newRatingA: ratingA,
        newRatingB: ratingB,
        nextSongAId: null,
        nextSongBId: null,
      }
    }

    const { newRatingA, newRatingB } = calculateElo(ratingA, ratingB, winner, {
      voteCountA,
      voteCountB,
    })
    await this.updateEloRatings(songAId, newRatingA, songBId, newRatingB)
    return { newRatingA, newRatingB, nextSongAId: null, nextSongBId: null }
  },

  async getAllVotes() {
    return []
  },

  async getVoteRoundCount() {
    return 0
  },

  async seedIfEmpty(seedSongs) {
    if (localSongRepository.getAll().length > 0) return
    localSongRepository.saveAll(seedSongs)
  },

  async deleteSongAndRecalculate(songId) {
    const songs = localSongRepository.getAll().filter((s) => s.id !== songId)
    localSongRepository.saveAll(songs)
    return songs
  },
}

export function getSongRepository(): SongRepository {
  return isSupabaseConfigured() ? supabaseSongRepository : localAsyncRepository
}

export function getStorageMode(): 'supabase' | 'local' {
  return isSupabaseConfigured() ? 'supabase' : 'local'
}
