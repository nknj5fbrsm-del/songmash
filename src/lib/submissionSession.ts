import { isSupabaseConfigured } from './supabaseClient'
import { isTurnstileEnabled } from './turnstileConfig'

type SessionState = {
  token: string
  expiresAt: number
}

let currentSession: SessionState | null = null

function getTurnstileSessionUrl(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) return null
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/turnstile-session`
}

function authHeaders(): Record<string, string> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`
    headers.apikey = anonKey
  }
  return headers
}

export function clearSubmissionSession(): void {
  currentSession = null
}

export function submissionSessionHeaders(): Record<string, string> {
  if (!isTurnstileEnabled() || !currentSession) return {}
  if (currentSession.expiresAt <= Date.now()) {
    currentSession = null
    return {}
  }
  return { 'x-submission-session': currentSession.token }
}

export async function openSubmissionSession(turnstileToken: string): Promise<void> {
  if (!isTurnstileEnabled()) return

  const url = getTurnstileSessionUrl()
  if (!url) {
    throw new Error('Sicherheitsprüfung ist nicht konfiguriert.')
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ turnstileToken }),
  })

  const data = (await res.json()) as {
    sessionToken?: string
    expiresInSeconds?: number
    error?: string
  }

  if (!res.ok || !data.sessionToken) {
    throw new Error(data.error ?? 'Sicherheitsprüfung fehlgeschlagen.')
  }

  const ttlMs = (data.expiresInSeconds ?? 300) * 1000
  currentSession = {
    token: data.sessionToken,
    expiresAt: Date.now() + ttlMs,
  }
}
