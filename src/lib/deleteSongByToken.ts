import { isSupabaseConfigured } from './supabaseClient'
import { hashDeletionToken } from './deletionToken'
import { localSongRepository } from './storage'
import { getDeletionHashes, removeDeletionHash } from './localDeletionHashes'
import { getSongRepository } from './repository'
import { computeVoteCounts } from './voteCounts'

export async function deleteSongByToken(token: string): Promise<{ title: string }> {
  const trimmed = token.trim()
  if (!trimmed) {
    throw new Error('Bitte den Lösch-Code eingeben.')
  }

  if (isSupabaseConfigured()) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/delete-song-by-token`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ token: trimmed }),
    })

    const body = (await res.json()) as { ok?: boolean; title?: string; error?: string }
    if (!res.ok) {
      throw new Error(body.error ?? 'Löschen fehlgeschlagen.')
    }
    if (!body.ok || !body.title) {
      throw new Error(body.error ?? 'Löschen fehlgeschlagen.')
    }
    return { title: body.title }
  }

  const tokenHash = await hashDeletionToken(trimmed)
  const hashes = getDeletionHashes()
  const songId = Object.entries(hashes).find(([, hash]) => hash === tokenHash)?.[0]

  if (!songId) {
    throw new Error('Ungültiger Lösch-Code.')
  }

  const existing = localSongRepository.getAll().find((s) => s.id === songId)
  const title = existing?.title ?? 'Song'

  const repository = getSongRepository()
  await repository.deleteSongAndRecalculate(songId)
  removeDeletionHash(songId)

  return { title }
}

export async function reloadSongsAfterTokenDelete() {
  const repository = getSongRepository()
  const [songs, votes] = await Promise.all([repository.getAll(), repository.getAllVotes()])
  return { songs, voteCounts: computeVoteCounts(votes) }
}
