const PROXY_HOSTS = ['suno.ai', 'suno.com', 'udio.com', 'audiocdn.com']

export function needsAudioProxy(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return PROXY_HOSTS.some((platform) => host === platform || host.endsWith(`.${platform}`))
  } catch {
    return false
  }
}

function getProxyBase(): string | null {
  const configured = import.meta.env.VITE_AUDIO_PROXY_URL as string | undefined
  if (configured) return configured.replace(/\/$/, '')
  if (import.meta.env.DEV) return '/api/proxy-audio'
  return null
}

/** Browser-taugliche URL — umgeht CORS via Proxy wenn nötig. */
export function getPlayableAudioUrl(url: string): string {
  if (!needsAudioProxy(url)) return url

  const base = getProxyBase()
  if (!base) return url

  return `${base}?url=${encodeURIComponent(url)}`
}
