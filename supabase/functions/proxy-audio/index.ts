/**
 * Supabase Edge Function: proxy-audio
 *
 * Deploy: supabase functions deploy proxy-audio
 * Client: VITE_AUDIO_PROXY_URL=https://<project>.supabase.co/functions/v1/proxy-audio
 */

import { fetchProxiedAudio } from '../_shared/proxyAudio.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const params = new URL(req.url)
    const targetUrl = params.searchParams.get('url')

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'URL fehlt' }), { status: 400 })
    }

    new URL(targetUrl)

    const upstream = await fetchProxiedAudio(targetUrl, {
      range: req.headers.get('range') ?? undefined,
    })

    const headers = new Headers(corsHeaders)
    headers.set('Content-Type', upstream.headers.get('content-type') ?? 'audio/mpeg')
    headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') ?? 'bytes')

    const contentLength = upstream.headers.get('content-length')
    const contentRange = upstream.headers.get('content-range')
    if (contentLength) headers.set('Content-Length', contentLength)
    if (contentRange) headers.set('Content-Range', contentRange)

    if (req.method === 'HEAD') {
      return new Response(null, { status: upstream.status, headers })
    }

    return new Response(upstream.body, { status: upstream.status, headers })
  } catch {
    return new Response(JSON.stringify({ error: 'Proxy fehlgeschlagen.' }), { status: 400 })
  }
})
