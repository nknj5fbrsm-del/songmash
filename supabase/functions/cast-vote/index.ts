/**
 * Vote + Elo serverseitig mit Rate-Limits (IP + voter_id).
 * Deploy: npx supabase functions deploy cast-vote --project-ref …
 * Migration: 20260608140000_vote_rate_limits.sql
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { calculateElo } from '../_shared/elo.ts'
import { clientIp } from '../_shared/turnstile.ts'
import {
  evaluateRateLimits,
  fetchRecentRateEvents,
  pruneOldRateEvents,
} from '../_shared/voteRateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-voter-id',
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type CastVoteBody = {
  songAId?: string
  songBId?: string
  winner?: string
  voterId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server-Konfiguration unvollständig.' }, 500)
  }

  try {
    const body = (await req.json()) as CastVoteBody
    const songAId = body.songAId?.trim() ?? ''
    const songBId = body.songBId?.trim() ?? ''
    const winner = body.winner?.trim() ?? ''
    const voterId = body.voterId?.trim() ?? ''

    if (!UUID_RE.test(songAId) || !UUID_RE.test(songBId) || songAId === songBId) {
      return json({ error: 'Ungültiges Song-Paar.' }, 400)
    }

    if (winner !== 'A' && winner !== 'B' && winner !== 'skip') {
      return json({ error: 'Ungültiges Vote-Ergebnis.' }, 400)
    }

    if (!UUID_RE.test(voterId)) {
      return json({ error: 'Ungültige Voter-ID.' }, 400)
    }

    const ip = clientIp(req) ?? 'unknown'
    const ipKey = `ip:${ip}`
    const supabase = createClient(supabaseUrl, serviceKey)

    const sinceDay = new Date(Date.now() - 86_400_000).toISOString()
    const pruneBefore = new Date(Date.now() - 48 * 3_600_000).toISOString()
    pruneOldRateEvents(supabase, pruneBefore).catch(() => {})

    const [ipEvents, voterEvents] = await Promise.all([
      fetchRecentRateEvents(supabase, 'ip_key', ipKey, sinceDay),
      fetchRecentRateEvents(supabase, 'voter_id', voterId, sinceDay),
    ])

    const violation = evaluateRateLimits(ipEvents, voterEvents, winner)
    if (violation) {
      return json(
        {
          error: violation.message,
          code: violation.code,
          retryAfterSec: violation.retryAfterSec,
        },
        429,
      )
    }

    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, elo_rating')
      .in('id', [songAId, songBId])

    if (songsError) throw new Error(songsError.message)

    const rowA = songs?.find((s) => s.id === songAId)
    const rowB = songs?.find((s) => s.id === songBId)
    if (!rowA || !rowB) {
      return json({ error: 'Song nicht gefunden.' }, 404)
    }

    const { count: countA } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .or(`song_a_id.eq.${songAId},song_b_id.eq.${songAId}`)

    const { count: countB } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .or(`song_a_id.eq.${songBId},song_b_id.eq.${songBId}`)

    const voteCountA = countA ?? 0
    const voteCountB = countB ?? 0

    let newRatingA = rowA.elo_rating as number
    let newRatingB = rowB.elo_rating as number

    if (winner !== 'skip') {
      const updated = calculateElo(
        newRatingA,
        newRatingB,
        winner as 'A' | 'B',
        voteCountA,
        voteCountB,
      )
      newRatingA = updated.newRatingA
      newRatingB = updated.newRatingB

      const [updA, updB] = await Promise.all([
        supabase.from('songs').update({ elo_rating: newRatingA }).eq('id', songAId),
        supabase.from('songs').update({ elo_rating: newRatingB }).eq('id', songBId),
      ])
      if (updA.error) throw new Error(updA.error.message)
      if (updB.error) throw new Error(updB.error.message)
    }

    const { error: voteError } = await supabase.from('votes').insert({
      song_a_id: songAId,
      song_b_id: songBId,
      winner,
    })
    if (voteError) throw new Error(voteError.message)

    const { error: rateError } = await supabase.from('vote_rate_events').insert({
      ip_key: ipKey,
      voter_id: voterId,
      winner,
    })
    if (rateError) throw new Error(rateError.message)

    return json({
      newRatingA,
      newRatingB,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vote fehlgeschlagen.'
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
