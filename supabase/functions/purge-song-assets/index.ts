/**
 * Löscht Audio/Cover aus R2 und/oder Supabase Storage (Moderation).
 * Deploy: supabase functions deploy purge-song-assets
 * Secret: MODERATOR_KEY — Client sendet x-moderator-session (moderator-auth).
 */

import { purgeHostedAssetsForRow } from '../_shared/purgeHostedAssets.ts'
import { requireModeratorRequest } from '../_shared/moderatorRequest.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-moderator-session',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    await requireModeratorRequest(req)

    const body = (await req.json()) as {
      audioUrl?: string
      coverUrl?: string | null
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
    const status = message.includes('Moderator-Session') ? 403 : 500
    return json({ error: message }, status)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
