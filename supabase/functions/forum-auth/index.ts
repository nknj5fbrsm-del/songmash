/**
 * Forum-Zugang: persönlicher Zugangscode oder (Übergang) gemeinsames Passwort.
 * Deploy: supabase functions deploy forum-auth
 * Secrets: FORUM_PASSWORD
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  findForumMemberByAccessCode,
  touchForumMemberLastSeen,
} from '../_shared/forumMember.ts'
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!forumPassword || !supabaseUrl || !serviceKey) {
    return json({ error: 'Forum ist serverseitig nicht konfiguriert.' }, 503)
  }

  try {
    const { password } = (await req.json()) as { password?: string }
    const credential = password?.trim() ?? ''
    if (!credential) {
      return json({ error: 'Zugangscode oder Passwort fehlt.' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    if (credential === forumPassword) {
      const sessionToken = await createForumSession(forumPassword)
      return json({
        sessionToken,
        expiresInSeconds: FORUM_SESSION_TTL_SEC,
        loginType: 'legacy',
      })
    }

    const member = await findForumMemberByAccessCode(supabase, credential)
    if (!member) {
      return json({ error: 'Ungültiger Zugangscode oder Passwort.' }, 403)
    }
    if (!member.is_active) {
      return json({ error: 'Dein Forum-Zugang wurde gesperrt.' }, 403)
    }

    await touchForumMemberLastSeen(supabase, member.id)
    const sessionToken = await createForumSession(forumPassword, { memberId: member.id })

    return json({
      sessionToken,
      expiresInSeconds: FORUM_SESSION_TTL_SEC,
      loginType: 'member',
      displayName: member.display_name,
    })
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
