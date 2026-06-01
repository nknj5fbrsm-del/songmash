/**
 * Löscht einen Song anhand des Klartext-Lösch-Codes (Hash-Vergleich serverseitig).
 * Deploy: supabase functions deploy delete-song-by-token
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hashDeletionToken, timingSafeEqual } from '../_shared/deletionTokenHash.ts'
import { recalculateEloFromVoteRows } from '../_shared/elo.ts'

const BUCKET = 'song-assets'
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getStoragePathFromPublicUrl(url: string): string | null {
  const idx = url.indexOf(PUBLIC_MARKER)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + PUBLIC_MARKER.length).split('?')[0])
}

function collectStoragePaths(row: { audio_url: string; cover_url: string | null }): string[] {
  const paths = [getStoragePathFromPublicUrl(row.audio_url)]
  if (row.cover_url) paths.push(getStoragePathFromPublicUrl(row.cover_url))
  return paths.filter((p): p is string => Boolean(p))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const { token } = (await req.json()) as { token?: string }
    if (!token?.trim()) return json({ error: 'Lösch-Code fehlt.' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Server-Konfiguration unvollständig.' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const tokenHash = await hashDeletionToken(token)

    const { data: candidates, error: findError } = await supabase
      .from('songs')
      .select('id, title, audio_url, cover_url, deletion_token_hash')
      .not('deletion_token_hash', 'is', null)

    if (findError) return json({ error: findError.message }, 500)

    const row = (candidates ?? []).find((s) =>
      s.deletion_token_hash &&
      timingSafeEqual(s.deletion_token_hash, tokenHash),
    )

    if (!row) {
      return json({ error: 'Ungültiger Lösch-Code.' }, 404)
    }

    const storagePaths = collectStoragePaths(row)
    if (storagePaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(storagePaths)
    }

    const { error: deleteError } = await supabase.from('songs').delete().eq('id', row.id)
    if (deleteError) return json({ error: deleteError.message }, 500)

    const { data: remainingSongs, error: songsError } = await supabase
      .from('songs')
      .select('id')

    if (songsError) return json({ error: songsError.message }, 500)

    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('song_a_id, song_b_id, winner, created_at')
      .order('created_at', { ascending: true })

    if (votesError) return json({ error: votesError.message }, 500)

    const songIds = (remainingSongs ?? []).map((s) => s.id)
    const ratings = recalculateEloFromVoteRows(songIds, votes ?? [])

    const updates = [...ratings.entries()].map(([id, elo_rating]) =>
      supabase.from('songs').update({ elo_rating }).eq('id', id),
    )
    await Promise.all(updates)

    return json({ ok: true, title: row.title })
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
