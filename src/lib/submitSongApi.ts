import type { Song } from '../types/song'
import { submissionSessionHeaders } from './submissionSession'
import { isSupabaseConfigured } from './supabaseClient'

function getSubmitSongUrl(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) return null
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/submit-song`
}

function authHeaders(): Record<string, string> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...submissionSessionHeaders(),
  }
  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`
    headers.apikey = anonKey
  }
  return headers
}

export async function submitSongViaApi(
  data: Omit<Song, 'id' | 'eloRating' | 'submissionDate'>,
  deletionTokenHash: string,
): Promise<Song> {
  const url = getSubmitSongUrl()
  if (!url) {
    throw new Error('Song-Einreichung ist nicht konfiguriert.')
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      title: data.title,
      artist: data.artist,
      audioUrl: data.audioUrl,
      sourceUrl: data.sourceUrl,
      coverUrl: data.coverUrl,
      description: data.description,
      techStackTags: data.techStackTags,
      deletionTokenHash,
    }),
  })

  const body = (await res.json()) as { song?: Song; error?: string }
  if (!res.ok || !body.song) {
    throw new Error(body.error ?? 'Song konnte nicht eingereicht werden.')
  }

  return body.song
}
