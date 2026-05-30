export function upstreamHeadersFor(url: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'audio/*,*/*;q=0.9',
  }

  const host = new URL(url).hostname.toLowerCase()

  if (host.includes('suno.')) {
    headers.Referer = 'https://suno.com/'
    headers.Origin = 'https://suno.com'
  }

  if (host.includes('udio.')) {
    headers.Referer = 'https://www.udio.com/'
    headers.Origin = 'https://www.udio.com'
  }

  return headers
}

export async function fetchProxiedAudio(
  targetUrl: string,
  requestHeaders: { range?: string },
): Promise<Response> {
  const headers = upstreamHeadersFor(targetUrl)

  if (requestHeaders.range) {
    headers.Range = requestHeaders.range
  }

  return fetch(targetUrl, { headers, redirect: 'follow' })
}
