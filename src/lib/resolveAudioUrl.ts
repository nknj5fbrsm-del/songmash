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

function getResolverUrl(): string | null {
  if (RESOLVER_URL) return RESOLVER_URL
  if (import.meta.env.DEV) return '/api/resolve-audio'
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

  try {
    const response = await fetch(resolverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sourceUrl }),
    })

    const data = (await response.json()) as { audioUrl?: string; error?: string }

    if (!response.ok || !data.audioUrl) {
      return {
        ok: false,
        error: data.error ?? 'Audio-Link konnte nicht aufgelöst werden.',
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
    const resolverUrl = getResolverUrl()
    if (resolverUrl) {
      return resolveViaBackend(trimmed)
    }

    return {
      ok: false,
      error:
        'Seiten-Links (Suno, Udio, YouTube …) brauchen den Audio-Resolver. Setze VITE_AUDIO_RESOLVER_URL für Production.',
    }
  }

  return { ok: true, audioUrl: trimmed, source: 'direct', sourceUrl: trimmed }
}
