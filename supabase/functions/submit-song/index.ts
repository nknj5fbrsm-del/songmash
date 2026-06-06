/**
 * Song-Einreichung nur mit gültiger Submit-Session (nach Turnstile).
 * Deploy: supabase functions deploy submit-song
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseHostedAssetUrl } from '../_shared/assetUrls.ts'
import { requireSubmissionSession, verifySubmissionSession } from '../_shared/submissionSession.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-submission-session',
}

const MAX_DESCRIPTION = 250
const MAX_TECH_TAGS = 100

type SubmitBody = {
  title?: string
  artist?: string
  audioUrl?: string
  sourceUrl?: string
  coverUrl?: string
  description?: string
  techStackTags?: string[]
  deletionTokenHash?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')?.trim()
  if (turnstileSecret) {
    const session = requireSubmissionSession(req)
    if (!session || !(await verifySubmissionSession(session, turnstileSecret))) {
      return json({ error: 'Sicherheits-Session ungültig oder abgelaufen.' }, 401)
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server-Konfiguration unvollständig.' }, 500)
  }

  try {
    const body = (await req.json()) as SubmitBody
    const title = body.title?.trim() ?? ''
    const artist = body.artist?.trim() ?? ''
    const audioUrl = body.audioUrl?.trim() ?? ''
    const deletionTokenHash = body.deletionTokenHash?.trim() ?? ''

    if (!title || !artist || !audioUrl || !deletionTokenHash) {
      return json({ error: 'Pflichtfelder fehlen.' }, 400)
    }

    if (!audioUrl.startsWith('https://')) {
      return json({ error: 'Ungültige Audio-URL.' }, 400)
    }

    if (!parseHostedAssetUrl(audioUrl)) {
      return json({ error: 'Audio muss auf dem SongMash-Speicher liegen.' }, 400)
    }

    const coverUrl = body.coverUrl?.trim()
    if (coverUrl) {
      if (!coverUrl.startsWith('https://') || !parseHostedAssetUrl(coverUrl)) {
        return json({ error: 'Ungültige Cover-URL.' }, 400)
      }
    }

    const description = body.description?.trim() || null
    if (description && description.length > MAX_DESCRIPTION) {
      return json({ error: `Infotext max. ${MAX_DESCRIPTION} Zeichen.` }, 400)
    }

    const tags = (body.techStackTags ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .join(',')
      .slice(0, MAX_TECH_TAGS)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: row, error } = await supabase
      .from('songs')
      .insert({
        title,
        artist,
        audio_url: audioUrl,
        source_url: body.sourceUrl?.trim() || null,
        cover_url: coverUrl || null,
        description,
        tech_stack_tags: tags,
        deletion_token_hash: deletionTokenHash,
      })
      .select('*')
      .single()

    if (error) return json({ error: error.message }, 400)

    const storedHash = (row as { deletion_token_hash?: string | null }).deletion_token_hash
    if (!storedHash || storedHash !== deletionTokenHash) {
      return json({ error: 'Lösch-Code konnte nicht zuverlässig gespeichert werden.' }, 500)
    }

    const { data: activeWeek } = await supabase
      .from('competition_weeks')
      .select('id')
      .eq('status', 'active')
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeWeek?.id) {
      await supabase.from('week_elo_snapshots').upsert(
        {
          week_id: activeWeek.id,
          song_id: row.id,
          elo_at_start: row.elo_rating,
        },
        { onConflict: 'week_id,song_id' },
      )
    }

    return json({
      song: {
        id: row.id,
        title: row.title,
        artist: row.artist,
        audioUrl: row.audio_url,
        sourceUrl: row.source_url ?? undefined,
        coverUrl: row.cover_url ?? undefined,
        description: row.description ?? undefined,
        eloRating: row.elo_rating,
        techStackTags: row.tech_stack_tags ?? [],
        submissionDate: row.submission_date,
      },
    })
  } catch {
    return json({ error: 'Einreichung fehlgeschlagen.' }, 400)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
