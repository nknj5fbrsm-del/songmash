import { isHostedAssetUrl } from './assetUrls'
import { isSupabaseConfigured } from './supabaseClient'
import { needsAudioProxy } from './audioProxy'
import { submissionSessionHeaders } from './submissionSession'

function getImportAudioUrl(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) return null
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/import-audio`
}

/** Externe Audio-URLs (Suno CDN) für Production in R2 spiegeln. */
export async function importAudioToStorage(sourceUrl: string): Promise<string> {
  if (isHostedAssetUrl(sourceUrl)) return sourceUrl
  if (!needsAudioProxy(sourceUrl)) return sourceUrl

  const importUrl = getImportAudioUrl()
  if (!importUrl) {
    throw new Error('Audio-Import ist nicht konfiguriert (Supabase fehlt).')
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`
    headers.apikey = anonKey
  }

  const response = await fetch(importUrl, {
    method: 'POST',
    headers: { ...headers, ...submissionSessionHeaders() },
    body: JSON.stringify({ url: sourceUrl }),
  })

  const data = (await response.json()) as { audioUrl?: string; error?: string; message?: string }

  if (!response.ok || !data.audioUrl) {
    const detail = data.error ?? data.message ?? response.statusText
    if (response.status === 404 || detail.includes('NOT_FOUND')) {
      throw new Error(
        'Audio-Import ist noch nicht aktiv. Bitte Edge Function „import-audio“ in Supabase deployen (siehe SUPABASE_SETUP.md).',
      )
    }
    throw new Error(detail || 'Audio-Import fehlgeschlagen.')
  }

  return data.audioUrl
}

export async function prepareAudioForPlayback(audioUrl: string): Promise<string> {
  if (isHostedAssetUrl(audioUrl)) return audioUrl
  if (import.meta.env.DEV) return audioUrl
  if (!needsAudioProxy(audioUrl)) return audioUrl
  if (!isSupabaseConfigured()) return audioUrl
  return importAudioToStorage(audioUrl)
}

export function isMirroredStorageUrl(url: string): boolean {
  return isHostedAssetUrl(url)
}
