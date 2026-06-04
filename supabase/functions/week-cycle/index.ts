/**
 * Finalisiert abgelaufene Wochen, legt die aktuelle Berlin-Kalenderwoche an, erstellt Elo-Snapshots.
 * Deploy: supabase functions deploy week-cycle
 * Cron (z. B. Sonntag 23:59 Europe/Berlin): POST …/functions/v1/week-cycle
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCurrentBerlinWeekBounds } from '../_shared/competitionWeek.ts'
import {
  computeWeekWinners,
  countVotesInWeek,
  type SongRow,
  type SnapshotRow,
  type VoteRow,
} from '../_shared/weekFinalize.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VOTES_PAGE = 1000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Server-Konfiguration unvollständig.' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const finalized: string[] = []

    const { data: overdue } = await supabase
      .from('competition_weeks')
      .select('id, starts_at, ends_at')
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString())

    for (const week of overdue ?? []) {
      await finalizeWeek(supabase, week.id, week.starts_at, week.ends_at)
      finalized.push(week.id)
    }

    const bounds = getCurrentBerlinWeekBounds()
    const startsIso = bounds.startsAt.toISOString()
    const endsIso = bounds.endsAt.toISOString()

    const { data: existing } = await supabase
      .from('competition_weeks')
      .select('id, status')
      .eq('starts_at', startsIso)
      .maybeSingle()

    let activeWeekId = existing?.id ?? null

    if (!existing) {
      const { data: created, error: createErr } = await supabase
        .from('competition_weeks')
        .insert({ starts_at: startsIso, ends_at: endsIso, status: 'active' })
        .select('id')
        .single()

      if (createErr) return json({ error: createErr.message }, 500)
      activeWeekId = created.id
      await createSnapshotsForWeek(supabase, created.id)
    } else if (existing.status === 'active') {
      await ensureSnapshots(supabase, existing.id)
    }

    return json({
      ok: true,
      finalizedWeekIds: finalized,
      activeWeekId,
      weekStartsAt: startsIso,
      weekEndsAt: endsIso,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unbekannter Fehler' }, 500)
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function finalizeWeek(supabase: any, weekId: string, startsAt: string, endsAt: string) {
  const { data: existingWinners } = await supabase
    .from('week_winners')
    .select('id')
    .eq('week_id', weekId)
    .limit(1)

  if (existingWinners?.length) {
    await supabase.from('competition_weeks').update({ status: 'finalized' }).eq('id', weekId)
    return
  }

  const { data: songs, error: songsErr } = await supabase
    .from('songs')
    .select('id, title, artist, elo_rating, submission_date')

  if (songsErr) throw new Error(songsErr.message)

  const { data: snapshots, error: snapErr } = await supabase
    .from('week_elo_snapshots')
    .select('song_id, elo_at_start')
    .eq('week_id', weekId)

  if (snapErr) throw new Error(snapErr.message)

  const votes = await fetchVotesInRange(supabase, startsAt, endsAt)
  const voteCounts = countVotesInWeek(votes, startsAt, endsAt)
  const winners = computeWeekWinners(
    (songs ?? []) as SongRow[],
    (snapshots ?? []) as SnapshotRow[],
    voteCounts,
  )

  if (winners.length > 0) {
    const { error: winErr } = await supabase.from('week_winners').insert(
      winners.map((w) => ({
        week_id: weekId,
        winner_type: w.winner_type,
        song_id: w.song_id,
        song_title: w.song_title,
        song_artist: w.song_artist,
        final_elo: w.final_elo,
        elo_delta: w.elo_delta,
        final_rank: w.final_rank,
        week_vote_count: w.week_vote_count,
      })),
    )
    if (winErr) throw new Error(winErr.message)
  }

  const { error: updErr } = await supabase
    .from('competition_weeks')
    .update({ status: 'finalized' })
    .eq('id', weekId)

  if (updErr) throw new Error(updErr.message)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchVotesInRange(supabase: any, startsAt: string, endsAt: string): Promise<VoteRow[]> {
  const rows: VoteRow[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('votes')
      .select('song_a_id, song_b_id, winner, created_at')
      .gte('created_at', startsAt)
      .lte('created_at', endsAt)
      .order('created_at', { ascending: true })
      .range(offset, offset + VOTES_PAGE - 1)

    if (error) throw new Error(error.message)
    const page = (data ?? []) as VoteRow[]
    rows.push(...page)
    if (page.length < VOTES_PAGE) break
    offset += VOTES_PAGE
  }

  return rows
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createSnapshotsForWeek(supabase: any, weekId: string) {
  const { data: songs, error } = await supabase.from('songs').select('id, elo_rating')
  if (error) throw new Error(error.message)
  if (!songs?.length) return

  const { error: insErr } = await supabase.from('week_elo_snapshots').upsert(
    songs.map((s: { id: string; elo_rating: number }) => ({
      week_id: weekId,
      song_id: s.id,
      elo_at_start: s.elo_rating,
    })),
    { onConflict: 'week_id,song_id' },
  )
  if (insErr) throw new Error(insErr.message)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSnapshots(supabase: any, weekId: string) {
  const { data: songs, error } = await supabase.from('songs').select('id, elo_rating')
  if (error) throw new Error(error.message)

  const { data: existing, error: exErr } = await supabase
    .from('week_elo_snapshots')
    .select('song_id')
    .eq('week_id', weekId)

  if (exErr) throw new Error(exErr.message)

  const have = new Set((existing ?? []).map((r: { song_id: string }) => r.song_id))
  const missing = (songs ?? []).filter((s: { id: string }) => !have.has(s.id))
  if (missing.length === 0) return

  const { error: insErr } = await supabase.from('week_elo_snapshots').insert(
    missing.map((s: { id: string; elo_rating: number }) => ({
      week_id: weekId,
      song_id: s.id,
      elo_at_start: s.elo_rating,
    })),
  )
  if (insErr) throw new Error(insErr.message)
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
