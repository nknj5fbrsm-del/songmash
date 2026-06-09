import { getOrCreateVoterId } from './voterId'
import { isSupabaseConfigured } from './supabaseClient'

export type GetMatchResult = {
  songAId: string | null
  songBId: string | null
}

function getGetMatchUrl(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) return null
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/get-match`
}

function authHeaders(): Record<string, string> {
  const voterId = getOrCreateVoterId()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-voter-id': voterId,
  }
  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`
    headers.apikey = anonKey
  }
  return headers
}

export async function fetchMatchViaApi(): Promise<GetMatchResult> {
  const url = getGetMatchUrl()
  if (!url) {
    throw new Error('Match-Abruf ist nicht konfiguriert.')
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ voterId: getOrCreateVoterId() }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    songAId?: string | null
    songBId?: string | null
  }

  if (!res.ok) {
    throw new Error(data.error ?? 'Match konnte nicht geladen werden.')
  }

  return {
    songAId: data.songAId ?? null,
    songBId: data.songBId ?? null,
  }
}
