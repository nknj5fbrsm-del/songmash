/**
 * Presigned PUT für Forum-Anhänge (Bild/Audio) — getrennt von SongMash-Einreichungen.
 * Erfordert gültige Forum-Session. Limit: 3 Uploads pro Stunde pro Session.
 * Deploy: supabase functions deploy forum-upload-presign
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireForumSession, verifyForumSession } from '../_shared/forumSession.ts'
import { recordForumUpload } from '../_shared/forumUploadLimit.ts'
import { presignPutObject } from '../_shared/r2.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-forum-session',
}

const MAX_AUDIO_BYTES = 15 * 1024 * 1024
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const ALLOWED_KINDS = new Set(['image', 'audio'])
const ALLOWED_EXTENSIONS: Record<string, Set<string>> = {
  image: new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']),
  audio: new Set(['mp3', 'wav', 'm4a', 'ogg', 'webm', 'aac']),
}

const FOLDER_BY_KIND: Record<string, string> = {
  image: 'forum/images',
  audio: 'forum/audio',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const forumSecret = Deno.env.get('FORUM_PASSWORD')?.trim()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!forumSecret || !supabaseUrl || !serviceKey) {
    return json({ error: 'Server-Konfiguration unvollständig.' }, 500)
  }

  const sessionToken = requireForumSession(req)
  if (!sessionToken || !(await verifyForumSession(sessionToken, forumSecret))) {
    return json({ error: 'Forum-Session ungültig oder abgelaufen. Bitte erneut anmelden.' }, 401)
  }

  try {
    const body = (await req.json()) as {
      kind?: string
      extension?: string
      contentType?: string
      contentLength?: number
    }

    const kind = body.kind?.trim()
    const extension = body.extension?.trim().toLowerCase().replace(/^\./, '')
    const contentType = body.contentType?.trim() || 'application/octet-stream'

    if (!kind || !ALLOWED_KINDS.has(kind)) {
      return json({ error: 'Ungültiger Anhang-Typ.' }, 400)
    }
    if (!extension || !ALLOWED_EXTENSIONS[kind]?.has(extension)) {
      return json({ error: 'Ungültige Dateiendung.' }, 400)
    }

    const maxBytes = kind === 'audio' ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES
    const contentLength = body.contentLength
    if (
      typeof contentLength !== 'number' ||
      !Number.isFinite(contentLength) ||
      contentLength <= 0 ||
      contentLength > maxBytes
    ) {
      return json({ error: 'Ungültige Dateigröße.' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    await recordForumUpload(supabase, sessionToken, kind as 'image' | 'audio')

    const folder = FOLDER_BY_KIND[kind]
    const key = `${folder}/${crypto.randomUUID()}.${extension}`
    const result = await presignPutObject(key, contentType)

    return json({
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
      key: result.key,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen.'
    return json({ error: message }, 400)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
