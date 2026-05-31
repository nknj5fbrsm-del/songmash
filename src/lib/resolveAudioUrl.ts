import { isSunoPageUrl, resolveSunoAudioUrl } from './sunoResolve'

const AUDIO_EXTENSION = /\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?|#|$)/i

const PAGE_PLATFORMS = [
  'suno.com',
  'suno.ai',
  'udio.com',
  'youtube.com',
  'youtu.be',
  'soundcloud.com',
  'spotify.com',
  'music.apple.com',
]

export type AudioSource = 'direct' | 'suno' | 'udio' | 'soundcloud' | 'resolved'

export type ResolveResult =
  | { ok: true; audioUrl: string; source: AudioSource; sourceUrl: string }
  | { ok: false; error: string }

const RESOLVER_URL = import.meta.env.VITE_AUDIO_RESOLVER_URL as string | undefined
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function getResolverUrl(): string | null {
  if (RESOLVER_URL) return RESOLVER_URL.replace(/\/$/, '')
  if (import.meta.env.DEV) return '/api/resolve-audio'
  if (SUPABASE_URL) return `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/resolve-audio`
  return null
}

export function isDirectAudioUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return AUDIO_EXTENSION.test(parsed.pathname)
  } catch {
    return false
  }
}

function isPagePlatform(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return PAGE_PLATFORMS.some((platform) => host === platform || host.endsWith(`.${platform}`))
}

function detectSource(url: string): AudioSource {
  const host = new URL(url).hostname.toLowerCase()
  if (host.includes('suno.')) return 'suno'
  if (host.includes('udio.')) return 'udio'
  if (host.includes('soundcloud.')) return 'soundcloud'
  return 'resolved'
}

async function resolveViaBackend(sourceUrl: string): Promise<ResolveResult> {
  const resolverUrl = getResolverUrl()
  if (!resolverUrl) {
    return { ok: false, error: 'Audio-Resolver ist nicht konfiguriert.' }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (SUPABASE_ANON_KEY) {
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`
    headers.apikey = SUPABASE_ANON_KEY
  }

  try {
    const response = await fetch(resolverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: sourceUrl }),
    })

    const data = (await response.json()) as { audioUrl?: string; error?: string; message?: string }

    if (!response.ok || !data.audioUrl) {
      return {
        ok: false,
        error: data.error ?? data.message ?? 'Audio-Link konnte nicht aufgelöst werden.',
      }
    }

    return {
      ok: true,
      audioUrl: data.audioUrl,
      source: detectSource(sourceUrl),
      sourceUrl,
    }
  } catch {
    return { ok: false, error: 'Verbindung zum Audio-Resolver fehlgeschlagen.' }
  }
}

export async function resolveAudioUrl(input: string): Promise<ResolveResult> {
  const trimmed = input.trim()

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, error: 'Bitte eine gültige URL eingeben.' }
  }

  if (isDirectAudioUrl(trimmed)) {
    return { ok: true, audioUrl: trimmed, source: 'direct', sourceUrl: trimmed }
  }

  const host = parsed.hostname.toLowerCase()

  if (isPagePlatform(host)) {
    if (isSunoPageUrl(trimmed)) {
      const sunoAudio = await resolveSunoAudioUrl(trimmed)
      if (sunoAudio) {
        return { ok: true, audioUrl: sunoAudio, source: 'suno', sourceUrl: trimmed }
      }
    }

    const resolverUrl = getResolverUrl()
    if (resolverUrl) {
      return resolveViaBackend(trimmed)
    }

    return {
      ok: false,
      error:
        'Seiten-Links (Udio, YouTube …) brauchen den Audio-Resolver. Suno-Links sollten direkt funktionieren — URL prüfen.',
    }
  }

  return { ok: true, audioUrl: trimmed, source: 'direct', sourceUrl: trimmed }
}
