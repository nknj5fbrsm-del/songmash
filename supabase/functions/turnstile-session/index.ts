/**
 * Tauscht ein Turnstile-Token gegen eine kurzlebige Submit-Session (5 Min.).
 * Deploy: supabase functions deploy turnstile-session
 * Secret: TURNSTILE_SECRET_KEY
 */

import { createSubmissionSession } from '../_shared/submissionSession.ts'
import { clientIp, verifyTurnstileToken } from '../_shared/turnstile.ts'

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

  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')?.trim()
  if (!secret) {
    return json({ error: 'Turnstile ist serverseitig nicht konfiguriert.' }, 503)
  }

  try {
    const { turnstileToken } = (await req.json()) as { turnstileToken?: string }
    if (!turnstileToken?.trim()) {
      return json({ error: 'Sicherheitsprüfung fehlt.' }, 400)
    }

    const ok = await verifyTurnstileToken(turnstileToken.trim(), secret, clientIp(req))
    if (!ok) {
      return json({ error: 'Sicherheitsprüfung ungültig. Bitte erneut bestätigen.' }, 403)
    }

    const sessionToken = await createSubmissionSession(secret)
    return json({ sessionToken, expiresInSeconds: 300 })
  } catch {
    return json({ error: 'Sicherheitsprüfung fehlgeschlagen.' }, 400)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
