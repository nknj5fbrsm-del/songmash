/**
 * Supabase Edge Function: resolve-audio
 *
 * Deploy: supabase functions deploy resolve-audio
 * Client: VITE_AUDIO_RESOLVER_URL=https://<project>.supabase.co/functions/v1/resolve-audio
 */

import { extractAudioFromPage } from '../_shared/extractAudioFromPage.ts'

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

    if (!url) {
      return json({ error: 'URL fehlt' }, 400)
    }

    new URL(url)

    const audioUrl = await extractAudioFromPage(url)

    if (!audioUrl) {
      return json({ error: 'Kein Audio-Link auf der Seite gefunden.' }, 422)
    }

    return json({ audioUrl })
  } catch {
    return json({ error: 'Ungültige Anfrage oder URL.' }, 400)
  }
})

function json(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
