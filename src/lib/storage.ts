import type { Song } from '../types/song'

const STORAGE_KEY = 'songmash:songs'

export interface SongRepository {
  getAll(): Song[]
  saveAll(songs: Song[]): void
  add(song: Song): void
  update(song: Song): void
}

export const localSongRepository: SongRepository = {
  getAll() {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Song[]) : []
  },

  saveAll(songs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs))
  },

  add(song) {
    const songs = this.getAll()
    songs.push(song)
    this.saveAll(songs)
  },

  update(song) {
    const songs = this.getAll().map((s) => (s.id === song.id ? song : s))
    this.saveAll(songs)
  },
}
