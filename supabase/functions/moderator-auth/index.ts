/**
 * Moderator-Zugang: Schlüssel → Session-Token (7 Tage). Key nur serverseitig.
 * Deploy: supabase functions deploy moderator-auth
 * Secret: MODERATOR_KEY
 */

import {
  createModeratorSession,
  MODERATOR_SESSION_TTL_SEC,
} from '../_shared/moderatorSession.ts'

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

  const moderatorKey = Deno.env.get('MODERATOR_KEY')?.trim()
  if (!moderatorKey) {
    return json({ error: 'Moderation ist serverseitig nicht konfiguriert.' }, 503)
  }

  try {
    const { key } = (await req.json()) as { key?: string }
    if (!key?.trim()) {
      return json({ error: 'Schlüssel fehlt.' }, 400)
    }

    if (key.trim() !== moderatorKey) {
      return json({ error: 'Ungültiger Moderator-Schlüssel.' }, 403)
    }

    const sessionToken = await createModeratorSession(moderatorKey)
    return json({ sessionToken, expiresInSeconds: MODERATOR_SESSION_TTL_SEC })
  } catch {
    return json({ error: 'Anmeldung fehlgeschlagen.' }, 400)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
