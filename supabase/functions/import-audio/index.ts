/**
 * Supabase Edge Function: import-audio
 *
 * Lädt externe Audio-URLs (Suno CDN etc.) serverseitig und speichert sie in Storage.
 * Deploy: supabase functions deploy import-audio
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractAudioFromPage } from '../_shared/extractAudioFromPage.ts'
import { fetchProxiedAudio } from '../_shared/proxyAudio.ts'
import { normalizeAudioContentType } from '../_shared/storageMime.ts'

const BUCKET = 'song-assets'
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Server-Konfiguration fehlt.' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const path = `audio/${crypto.randomUUID()}.mp3`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: normalizeAudioContentType(upstream.headers.get('content-type')),
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      return json({ error: `Upload fehlgeschlagen: ${uploadError.message}` }, 500)
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return json({ audioUrl: data.publicUrl })
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
