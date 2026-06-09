/**
 * Liefert das aktive Match einer Voter-Session (Reload = gleiches Paar).
 * Deploy: npx supabase functions deploy get-match --project-ref …
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchGlobalVoteCounts } from '../_shared/voteCounts.ts'
import { resolveVoterMatch } from '../_shared/voterMatchSession.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-voter-id',
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type GetMatchBody = {
  voterId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server-Konfiguration unvollständig.' }, 500)
  }

  try {
    let voterId = req.headers.get('x-voter-id')?.trim() ?? ''

    if (req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as GetMatchBody
      if (body.voterId?.trim()) voterId = body.voterId.trim()
    }

    if (!UUID_RE.test(voterId)) {
      return json({ error: 'Ungültige Voter-ID.' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const [{ data: songRows, error: songsError }, voteCounts] = await Promise.all([
      supabase.from('songs').select('id'),
      fetchGlobalVoteCounts(supabase),
    ])

    if (songsError) throw new Error(songsError.message)

    const songs = (songRows ?? []).map((row: { id: string }) => ({ id: row.id }))
    const match = await resolveVoterMatch(supabase, voterId, songs, voteCounts)

    if (!match) {
      return json({ songAId: null, songBId: null })
    }

    return json({ songAId: match.songAId, songBId: match.songBId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Match konnte nicht geladen werden.'
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
