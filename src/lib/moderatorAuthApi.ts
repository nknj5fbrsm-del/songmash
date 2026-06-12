import { clearModeratorSession, readModeratorSession, writeModeratorSession } from './moderatorStorage'
import { isSupabaseConfigured } from './supabaseClient'

export class ModeratorAuthError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ModeratorAuthError'
    this.status = status
  }
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

export async function moderatorLogin(key: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) {
    throw new ModeratorAuthError('Moderation ist nicht konfiguriert (Supabase fehlt).', 503)
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/moderator-auth`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ key: key.trim() }),
  })

  const data = (await response.json()) as { sessionToken?: string; error?: string }

  if (!response.ok) {
    if (response.status === 403) {
      clearModeratorSession()
    }
    throw new ModeratorAuthError(data.error ?? response.statusText, response.status)
  }

  if (!data.sessionToken) {
    throw new ModeratorAuthError('Anmeldung fehlgeschlagen.', 500)
  }

  writeModeratorSession(data.sessionToken)
}

export function moderatorHeaders(): Record<string, string> {
  const session = readModeratorSession()
  if (!session) {
    throw new ModeratorAuthError('Moderator nicht angemeldet.', 403)
  }
  return { ...authHeaders(), 'x-moderator-session': session }
}
