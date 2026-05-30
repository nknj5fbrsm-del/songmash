import type { Song, VoteRecord, VoteResult } from '../types/song'
import { applyEloRatings, recalculateEloRatings } from './recalculateElo'
import { getSupabaseClient } from './supabaseClient'
import { collectStoragePaths, STORAGE_BUCKET } from './storagePaths'

type SongRow = {
  id: string
  title: string
  artist: string
  audio_url: string
  source_url: string | null
  cover_url: string | null
  description: string | null
  elo_rating: number
  tech_stack_tags: string[]
  submission_date: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function rowToSong(row: SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    audioUrl: row.audio_url,
    sourceUrl: row.source_url ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    description: row.description ?? undefined,
    eloRating: row.elo_rating,
    techStackTags: row.tech_stack_tags ?? [],
    submissionDate: row.submission_date,
  }
}

function songToInsert(data: Omit<Song, 'id' | 'eloRating' | 'submissionDate'>) {
  return {
    title: data.title,
    artist: data.artist,
    audio_url: data.audioUrl,
    source_url: data.sourceUrl ?? null,
    cover_url: data.coverUrl ?? null,
    description: data.description ?? null,
    tech_stack_tags: data.techStackTags,
  }
}

export const supabaseSongRepository = {
  async getAll(): Promise<Song[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('elo_rating', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []).map(rowToSong)
  },

  async insert(data: Omit<Song, 'id' | 'eloRating' | 'submissionDate'>): Promise<Song> {
    const supabase = getSupabaseClient()
    const { data: row, error } = await supabase
      .from('songs')
      .insert(songToInsert(data))
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return rowToSong(row)
  },

  async updateEloRatings(
    songAId: string,
    newRatingA: number,
    songBId: string,
    newRatingB: number,
  ): Promise<void> {
    const supabase = getSupabaseClient()

    const [updateA, updateB] = await Promise.all([
      supabase.from('songs').update({ elo_rating: newRatingA }).eq('id', songAId),
      supabase.from('songs').update({ elo_rating: newRatingB }).eq('id', songBId),
    ])

    if (updateA.error) throw new Error(updateA.error.message)
    if (updateB.error) throw new Error(updateB.error.message)
  },

  async recordVote(songAId: string, songBId: string, winner: VoteResult): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('votes').insert({
      song_a_id: songAId,
      song_b_id: songBId,
      winner,
    })

    if (error) throw new Error(error.message)
  },

  async seedIfEmpty(seedSongs: Song[]): Promise<void> {
    const existing = await this.getAll()
    if (existing.length > 0) return

    const supabase = getSupabaseClient()
    const { error } = await supabase.from('songs').insert(
      seedSongs.map((song) => ({
        ...(UUID_RE.test(song.id) ? { id: song.id } : {}),
        title: song.title,
        artist: song.artist,
        audio_url: song.audioUrl,
        source_url: song.sourceUrl ?? null,
        cover_url: song.coverUrl ?? null,
        description: song.description ?? null,
        elo_rating: song.eloRating,
        tech_stack_tags: song.techStackTags,
        submission_date: song.submissionDate,
      })),
    )

    if (error) throw new Error(error.message)
  },

  async getAllVotes(): Promise<VoteRecord[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('votes')
      .select('id, song_a_id, song_b_id, winner, created_at')
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    return (data ?? []).map((row) => ({
      id: row.id,
      songAId: row.song_a_id,
      songBId: row.song_b_id,
      winner: row.winner as VoteResult,
      createdAt: row.created_at,
    }))
  },

  async persistEloRatings(ratings: Map<string, number>): Promise<void> {
    const supabase = getSupabaseClient()
    const updates = [...ratings.entries()].map(([id, elo_rating]) =>
      supabase.from('songs').update({ elo_rating }).eq('id', id),
    )
    const results = await Promise.all(updates)
    const failed = results.find((r) => r.error)
    if (failed?.error) throw new Error(failed.error.message)
  },

  async deleteSongAndRecalculate(songId: string): Promise<Song[]> {
    const supabase = getSupabaseClient()

    const { data: row, error: fetchError } = await supabase
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    const song = rowToSong(row as SongRow)
    const storagePaths = collectStoragePaths(song)

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(storagePaths)
      // Storage-Fehler nicht blockieren (Datei evtl. schon weg oder externer Link)
      if (storageError) {
        console.warn('Storage cleanup:', storageError.message)
      }
    }

    const { data: deleted, error: deleteError } = await supabase
      .from('songs')
      .delete()
      .eq('id', songId)
      .select('id')

    if (deleteError) throw new Error(deleteError.message)

    if (!deleted?.length) {
      throw new Error(
        'Löschen fehlgeschlagen — fehlende DB-Berechtigung. Führe supabase/migrations/20260530220000_moderation.sql im SQL Editor aus.',
      )
    }

    const [songs, votes] = await Promise.all([this.getAll(), this.getAllVotes()])
    const ratings = recalculateEloRatings(songs, votes)
    await this.persistEloRatings(ratings)

    return applyEloRatings(songs, ratings)
  },
}
