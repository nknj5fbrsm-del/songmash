import { getOrCreateVoterId } from './voterId'
import { isSupabaseConfigured } from './supabaseClient'
import type { VoteResult } from '../types/song'

export type CastVoteErrorCode =
  | 'RATE_INTERVAL'
  | 'RATE_MINUTE'
  | 'RATE_HOUR'
  | 'RATE_DAY'
  | 'SKIP_HOUR'
  | 'SKIP_DAY'
  | 'SKIP_COOLDOWN'
  | 'SESSION_MISMATCH'

export const VOTE_RATE_LIMIT_CODES = ['RATE_MINUTE', 'RATE_HOUR', 'RATE_DAY'] as const

export function isVoteRateLimitCode(
  code: CastVoteErrorCode | 'UNKNOWN',
): code is (typeof VOTE_RATE_LIMIT_CODES)[number] {
  return (VOTE_RATE_LIMIT_CODES as readonly string[]).includes(code)
}

export class CastVoteError extends Error {
  code: CastVoteErrorCode | 'UNKNOWN'
  retryAfterSec: number

  constructor(message: string, code: CastVoteErrorCode | 'UNKNOWN', retryAfterSec: number) {
    super(message)
    this.name = 'CastVoteError'
    this.code = code
    this.retryAfterSec = retryAfterSec
  }
}

export type CastVoteResult = {
  newRatingA: number
  newRatingB: number
  nextSongAId: string | null
  nextSongBId: string | null
}

function getCastVoteUrl(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) return null
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/cast-vote`
}

export async function castVoteViaApi(
  songAId: string,
  songBId: string,
  winner: VoteResult,
): Promise<CastVoteResult> {
  const url = getCastVoteUrl()
  if (!url) {
    throw new Error('Voting ist nicht konfiguriert.')
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-voter-id': getOrCreateVoterId(),
  }
  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`
    headers.apikey = anonKey
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      songAId,
      songBId,
      winner,
      voterId: getOrCreateVoterId(),
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: CastVoteErrorCode
    retryAfterSec?: number
    newRatingA?: number
    newRatingB?: number
    nextSongAId?: string | null
    nextSongBId?: string | null
  }

  if (!res.ok) {
    throw new CastVoteError(
      data.error ?? 'Vote konnte nicht gespeichert werden.',
      data.code ?? 'UNKNOWN',
      data.retryAfterSec ?? (res.status === 409 ? 0 : 5),
    )
  }

  if (typeof data.newRatingA !== 'number' || typeof data.newRatingB !== 'number') {
    throw new Error('Ungültige Server-Antwort.')
  }

  return {
    newRatingA: data.newRatingA,
    newRatingB: data.newRatingB,
    nextSongAId: data.nextSongAId ?? null,
    nextSongBId: data.nextSongBId ?? null,
  }
}
