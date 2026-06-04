import { isSupabaseConfigured } from './supabaseClient'
import { hashDeletionToken } from './deletionToken'
import { localSongRepository } from './storage'
import { getDeletionHashes, removeDeletionHash } from './localDeletionHashes'
import { getSongRepository } from './repository'
import { computeVoteCounts } from './voteCounts'

export type DeletionPreview = {
  title: string
  artist: string
}

type ApiBody = {
  ok?: boolean
  preview?: boolean
  title?: string
  artist?: string
  error?: string
}

async function callDeletionTokenApi(
  token: string,
  options: { preview: boolean },
): Promise<ApiBody> {
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
    body: JSON.stringify({ token, preview: options.preview }),
  })

  const body = (await res.json()) as ApiBody
  if (!res.ok) {
    throw new Error(body.error ?? (options.preview ? 'Code konnte nicht geprüft werden.' : 'Löschen fehlgeschlagen.'))
  }
  return body
}

async function resolveLocalSongByToken(trimmed: string): Promise<DeletionPreview> {
  const tokenHash = await hashDeletionToken(trimmed)
  const hashes = getDeletionHashes()
  const songId = Object.entries(hashes).find(([, hash]) => hash === tokenHash)?.[0]

  if (!songId) {
    throw new Error('Ungültiger Lösch-Code.')
  }

  const existing = localSongRepository.getAll().find((s) => s.id === songId)
  if (!existing) {
    throw new Error('Ungültiger Lösch-Code.')
  }

  return { title: existing.title, artist: existing.artist }
}

export async function previewDeletionByToken(token: string): Promise<DeletionPreview> {
  const trimmed = token.trim()
  if (!trimmed) {
    throw new Error('Bitte den Lösch-Code eingeben.')
  }

  if (isSupabaseConfigured()) {
    const body = await callDeletionTokenApi(trimmed, { preview: true })
    if (!body.preview || !body.title) {
      throw new Error(body.error ?? 'Ungültiger Lösch-Code.')
    }
    return { title: body.title, artist: body.artist ?? '' }
  }

  return resolveLocalSongByToken(trimmed)
}

export async function deleteSongByToken(token: string): Promise<{ title: string }> {
  const trimmed = token.trim()
  if (!trimmed) {
    throw new Error('Bitte den Lösch-Code eingeben.')
  }

  if (isSupabaseConfigured()) {
    const body = await callDeletionTokenApi(trimmed, { preview: false })
    if (!body.ok || !body.title) {
      throw new Error(body.error ?? 'Löschen fehlgeschlagen.')
    }
    return { title: body.title }
  }

  const preview = await resolveLocalSongByToken(trimmed)
  const tokenHash = await hashDeletionToken(trimmed)
  const hashes = getDeletionHashes()
  const songId = Object.entries(hashes).find(([, hash]) => hash === tokenHash)?.[0]

  if (!songId) {
    throw new Error('Ungültiger Lösch-Code.')
  }

  const repository = getSongRepository()
  await repository.deleteSongAndRecalculate(songId)
  removeDeletionHash(songId)

  return { title: preview.title }
}

export async function reloadSongsAfterTokenDelete() {
  const repository = getSongRepository()
  const [songs, votes, totalVoteRounds] = await Promise.all([
    repository.getAll(),
    repository.getAllVotes(),
    repository.getVoteRoundCount(),
  ])
  return { songs, voteCounts: computeVoteCounts(votes), totalVoteRounds }
}
