/**
 * Phase 2: Bestehende Supabase-Storage-URLs nach R2 kopieren und DB aktualisieren.
 * Deploy: supabase functions deploy migrate-assets-to-r2
 * Secret: MODERATOR_KEY
 *
 * POST { dryRun?: boolean, limit?: number }
 * Header: x-moderator-session
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getSupabaseStoragePathFromUrl } from '../_shared/assetUrls.ts'
import { requireModeratorRequest } from '../_shared/moderatorRequest.ts'
import { uploadBytesToR2 } from '../_shared/r2.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-moderator-session',
}

type SongRow = {
  id: string
  title: string
  audio_url: string
  cover_url: string | null
}

async function migrateUrl(
  url: string,
  dryRun: boolean,
): Promise<{ oldUrl: string; newUrl: string } | null> {
  const path = getSupabaseStoragePathFromUrl(url)
  if (!path) return null

  if (dryRun) {
    return { oldUrl: url, newUrl: `[dry-run] r2://${path}` }
  }

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Download fehlgeschlagen (${res.status}): ${url}`)
  }

  const bytes = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const publicUrl = await uploadBytesToR2(path, bytes, contentType)
  return { oldUrl: url, newUrl: publicUrl }
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
      dryRun?: boolean
      limit?: number
    }

    const dryRun = body.dryRun === true
    const limit = Math.min(Math.max(body.limit ?? 50, 1), 200)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Server-Konfiguration fehlt.' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: songs, error } = await supabase
      .from('songs')
      .select('id, title, audio_url, cover_url')
      .limit(1000)

    if (error) return json({ error: error.message }, 500)

    const pending = (songs as SongRow[]).filter(
      (s) =>
        getSupabaseStoragePathFromUrl(s.audio_url) ||
        (s.cover_url && getSupabaseStoragePathFromUrl(s.cover_url)),
    )

    const batch = pending.slice(0, limit)
    const results: {
      id: string
      title: string
      audio?: { oldUrl: string; newUrl: string }
      cover?: { oldUrl: string; newUrl: string }
      error?: string
    }[] = []

    for (const song of batch) {
      try {
        const entry: (typeof results)[number] = { id: song.id, title: song.title }

        const audio = await migrateUrl(song.audio_url, dryRun)
        if (audio) entry.audio = audio

        if (song.cover_url) {
          const cover = await migrateUrl(song.cover_url, dryRun)
          if (cover) entry.cover = cover
        }

        if (!dryRun && (entry.audio || entry.cover)) {
          const updates: { audio_url?: string; cover_url?: string } = {}
          if (entry.audio) updates.audio_url = entry.audio.newUrl
          if (entry.cover) updates.cover_url = entry.cover.newUrl

          const { error: updateError } = await supabase
            .from('songs')
            .update(updates)
            .eq('id', song.id)

          if (updateError) throw new Error(updateError.message)
        }

        results.push(entry)
      } catch (err) {
        results.push({
          id: song.id,
          title: song.title,
          error: err instanceof Error ? err.message : 'Unbekannter Fehler',
        })
      }
    }

    return json({
      dryRun,
      totalPending: pending.length,
      processed: results.length,
      results,
    })
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
