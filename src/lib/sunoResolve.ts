const UUID_RE =
  /\/(?:song|embed|share)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

const SILENCE_MP3 = /\/sil-\d+\.mp3/i

function buildSunoMp3Url(uuid: string): string {
  return `https://cdn1.suno.ai/${uuid.toLowerCase()}.mp3`
}

export function isSunoPageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'suno.com' || host.endsWith('.suno.com') || host === 'suno.ai' || host.endsWith('.suno.ai')
  } catch {
    return false
  }
}

function resolveSunoFromPath(pageUrl: string): string | null {
  try {
    const parsed = new URL(pageUrl)
    const match = parsed.pathname.match(UUID_RE)
    return match?.[1] ? buildSunoMp3Url(match[1]) : null
  } catch {
    return null
  }
}

async function resolveSunoShortLink(pageUrl: string): Promise<string | null> {
  try {
    const parsed = new URL(pageUrl)
    if (!/^\/s\/[A-Za-z0-9_-]+/.test(parsed.pathname)) return null

    const lookupUrl = `${parsed.host}${parsed.pathname}`
    const apiResponse = await fetch(
      `https://opensuno.vercel.app/track?url=${encodeURIComponent(lookupUrl)}`,
    )

    if (apiResponse.ok) {
      const payload = (await apiResponse.json()) as {
        data?: { mp3_url?: string; id?: string }
      }

      if (payload.data?.mp3_url && !SILENCE_MP3.test(payload.data.mp3_url)) {
        return payload.data.mp3_url
      }

      if (payload.data?.id) {
        return buildSunoMp3Url(payload.data.id)
      }
    }

    return null
  } catch {
    return null
  }
}

/** Suno-Seitenlinks ohne Backend auflösen (Browser). */
export async function resolveSunoAudioUrl(pageUrl: string): Promise<string | null> {
  const direct = resolveSunoFromPath(pageUrl)
  if (direct) return direct

  if (pageUrl.includes('/s/')) {
    return resolveSunoShortLink(pageUrl)
  }

  return null
}
