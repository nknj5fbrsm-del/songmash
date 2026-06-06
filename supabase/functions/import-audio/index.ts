/**
 * Supabase Edge Function: import-audio
 *
 * Lädt externe Audio-URLs (Suno CDN etc.) serverseitig und speichert sie in Cloudflare R2.
 * Deploy: supabase functions deploy import-audio
 */

import { extractAudioFromPage } from '../_shared/extractAudioFromPage.ts'
import { fetchProxiedAudio } from '../_shared/proxyAudio.ts'
import { uploadBytesToR2 } from '../_shared/r2.ts'
import { normalizeAudioContentType } from '../_shared/storageMime.ts'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const { url } = (await req.json()) as { url?: string }
    if (!url) return json({ error: 'URL fehlt' }, 400)

    new URL(url)

    let audioUrl = url
    if (!/\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?|#|$)/i.test(new URL(url).pathname)) {
      const resolved = await extractAudioFromPage(url)
      if (!resolved) return json({ error: 'Kein Audio-Link gefunden.' }, 422)
      audioUrl = resolved
    }

    const upstream = await fetchProxiedAudio(audioUrl, {})
    if (!upstream.ok) {
      return json({ error: 'Audio konnte nicht geladen werden.' }, 422)
    }

    const bytes = await upstream.arrayBuffer()
    if (bytes.byteLength === 0) {
      return json({ error: 'Audio-Datei ist leer.' }, 422)
    }

    const key = `audio/${crypto.randomUUID()}.mp3`
    const contentType = normalizeAudioContentType(upstream.headers.get('content-type'))
    const publicUrl = await uploadBytesToR2(key, bytes, contentType)
    return json({ audioUrl: publicUrl })
  } catch {
    return json({ error: 'Import fehlgeschlagen.' }, 400)
  }
})

function json(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
