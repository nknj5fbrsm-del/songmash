/**
 * Löscht Audio/Cover aus R2 und/oder Supabase Storage (Moderation).
 * Deploy: supabase functions deploy purge-song-assets
 * Secret: MODERATOR_KEY (gleicher Wert wie VITE_MODERATOR_KEY im Client)
 */

import { purgeHostedAssetsForRow } from '../_shared/purgeHostedAssets.ts'

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
    const body = (await req.json()) as {
      audioUrl?: string
      coverUrl?: string | null
      moderatorKey?: string
    }

    const expectedKey = Deno.env.get('MODERATOR_KEY')?.trim()
    if (!expectedKey) {
      return json({ error: 'MODERATOR_KEY nicht konfiguriert.' }, 500)
    }

    const provided = body.moderatorKey?.trim()
    if (!provided || provided !== expectedKey) {
      return json({ error: 'Ungültiger Moderator-Schlüssel.' }, 403)
    }

    if (!body.audioUrl?.trim()) {
      return json({ error: 'audioUrl fehlt.' }, 400)
    }

    await purgeHostedAssetsForRow({
      audio_url: body.audioUrl.trim(),
      cover_url: body.coverUrl?.trim() || null,
    })

    return json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
