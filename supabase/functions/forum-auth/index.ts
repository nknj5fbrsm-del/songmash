/**
 * Forum-Zugang: gemeinsames Passwort → Session-Token (7 Tage).
 * Deploy: supabase functions deploy forum-auth
 * Secret: FORUM_PASSWORD
 */

import {
  createForumSession,
  FORUM_SESSION_TTL_SEC,
} from '../_shared/forumSession.ts'

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

  const forumPassword = Deno.env.get('FORUM_PASSWORD')?.trim()
  if (!forumPassword) {
    return json({ error: 'Forum ist serverseitig nicht konfiguriert.' }, 503)
  }

  try {
    const { password } = (await req.json()) as { password?: string }
    if (!password?.trim()) {
      return json({ error: 'Passwort fehlt.' }, 400)
    }

    if (password.trim() !== forumPassword) {
      return json({ error: 'Falsches Passwort.' }, 403)
    }

    const sessionToken = await createForumSession(forumPassword)
    return json({ sessionToken, expiresInSeconds: FORUM_SESSION_TTL_SEC })
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
