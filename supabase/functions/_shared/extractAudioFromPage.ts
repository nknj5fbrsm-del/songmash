const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

const SILENCE_MP3 = /\/sil-\d+\.mp3/i

function buildSunoMp3Url(uuid: string): string {
  return `https://cdn1.suno.ai/${uuid.toLowerCase()}.mp3`
}

function extractUuidFromPath(pathname: string): string | null {
  const match = pathname.match(
    /\/(?:song|embed|share)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  )
  return match?.[1] ?? null
}

function isSunoHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return host === 'suno.com' || host.endsWith('.suno.com') || host === 'suno.ai' || host.endsWith('.suno.ai')
}

function resolveSunoFromUrl(pageUrl: string): string | null {
  try {
    const parsed = new URL(pageUrl)
    if (!isSunoHost(parsed.hostname)) return null

    const uuid = extractUuidFromPath(parsed.pathname)
    if (uuid) return buildSunoMp3Url(uuid)

    return null
  } catch {
    return null
  }
}

async function resolveSunoShortLink(pageUrl: string): Promise<string | null> {
  try {
    const parsed = new URL(pageUrl)
    if (!isSunoHost(parsed.hostname)) return null
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

    const redirectResponse = await fetch(pageUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })

    return resolveSunoFromUrl(redirectResponse.url)
  } catch {
    return null
  }
}

function pickBestMp3FromHtml(html: string, preferredUuid?: string | null): string | null {
  const mp3Urls = [...html.matchAll(/https?:\/\/cdn1\.suno\.ai\/[^"'<>\s]+/gi)]
    .map((match) => decodeHtmlEntities(match[0].replace(/\\$/, '')))
    .filter((url) => url.endsWith('.mp3') && !SILENCE_MP3.test(url))

  if (preferredUuid) {
    const uuidMatch = mp3Urls.find((url) =>
      url.toLowerCase().includes(preferredUuid.toLowerCase()),
    )
    if (uuidMatch) return uuidMatch
  }

  return mp3Urls[0] ?? null
}

export async function extractAudioFromPage(pageUrl: string): Promise<string | null> {
  const directSuno = resolveSunoFromUrl(pageUrl)
  if (directSuno) return directSuno

  const shortSuno = await resolveSunoShortLink(pageUrl)
  if (shortSuno) return shortSuno

  const parsedPageUrl = new URL(pageUrl)
  const preferredUuid = isSunoHost(parsedPageUrl.hostname)
    ? extractUuidFromPath(parsedPageUrl.pathname)
    : null

  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })

  if (!response.ok) return null

  const html = await response.text()

  const htmlMp3 = pickBestMp3FromHtml(html, preferredUuid)
  if (htmlMp3) return htmlMp3

  const ogPatterns = [
    /<meta[^>]+property=["']og:audio(?::url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:audio(?::url)?["']/i,
  ]

  for (const pattern of ogPatterns) {
    const match = html.match(pattern)
    const candidate = match?.[1] ? decodeHtmlEntities(match[1]) : null
    if (candidate && !SILENCE_MP3.test(candidate)) return candidate
  }

  const uuidFromHtml = html.match(UUID_RE)?.[0]
  if (uuidFromHtml && isSunoHost(parsedPageUrl.hostname)) {
    return buildSunoMp3Url(uuidFromHtml)
  }

  return null
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function isSilencePlaceholder(url: string): boolean {
  return SILENCE_MP3.test(url)
}
