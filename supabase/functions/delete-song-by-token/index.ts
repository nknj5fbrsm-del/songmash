/**
 * Löscht einen Song anhand des Klartext-Lösch-Codes (Hash-Vergleich serverseitig).
 * R2-Purge, dann DB-Löschung vor der Antwort; Elo-Neuberechnung im Hintergrund.
 * Deploy: supabase functions deploy delete-song-by-token
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { scheduleBackground } from '../_shared/backgroundTask.ts'
import { hashDeletionToken } from '../_shared/deletionTokenHash.ts'
import { purgeHostedAssetsForRow } from '../_shared/purgeHostedAssets.ts'
import { recalculateAllSongElo } from '../_shared/recalculateAllElo.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SongRow = {
  id: string
  title: string
  artist: string
  audio_url: string
  cover_url: string | null
}

async function runEloRecalcInBackground(supabase: ReturnType<typeof createClient>): Promise<void> {
  try {
    await recalculateAllSongElo(supabase)
  } catch (err) {
    console.error('Elo recalculation failed:', err)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const { token, preview } = (await req.json()) as { token?: string; preview?: boolean }
    if (!token?.trim()) return json({ error: 'Lösch-Code fehlt.' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Server-Konfiguration unvollständig.' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const tokenHash = await hashDeletionToken(token)

    const { data: row, error: findError } = await supabase
      .from('songs')
      .select('id, title, artist, audio_url, cover_url')
      .eq('deletion_token_hash', tokenHash)
      .maybeSingle()

    if (findError) return json({ error: findError.message }, 500)

    if (!row) {
      return json({ error: 'Ungültiger Lösch-Code.' }, 404)
    }

    const song = row as SongRow

    if (preview === true) {
      return json({ preview: true, title: song.title, artist: song.artist })
    }

    const assetSnapshot = { audio_url: song.audio_url, cover_url: song.cover_url }
    const title = song.title

    try {
      await purgeHostedAssetsForRow(assetSnapshot)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unbekannter Fehler'
      console.error('R2/Storage purge failed:', detail)
      return json(
        {
          error: `Dateien konnten nicht gelöscht werden — der Song bleibt bestehen. (${detail})`,
        },
        500,
      )
    }

    const { error: deleteError } = await supabase.from('songs').delete().eq('id', song.id)
    if (deleteError) return json({ error: deleteError.message }, 500)

    scheduleBackground(runEloRecalcInBackground(supabase))

    return json({ ok: true, title })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    console.error('delete-song-by-token:', message)
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
