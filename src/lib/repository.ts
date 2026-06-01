import type { Song, VoteRecord, VoteResult } from '../types/song'
import { isSupabaseConfigured } from './supabaseClient'
import { setDeletionHash } from './localDeletionHashes'
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
  recordVote(songAId: string, songBId: string, winner: VoteResult): Promise<void>
  getAllVotes(): Promise<VoteRecord[]>
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

  async recordVote() {
    // Vote history only persisted in Supabase
  },

  async getAllVotes() {
    return []
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
