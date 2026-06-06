/**
 * Presigned PUT-URL für direkten Browser-Upload nach Cloudflare R2.
 * Deploy: supabase functions deploy r2-presign
 */

import { presignPutObject } from '../_shared/r2.ts'
import { requireSubmissionSession, verifySubmissionSession } from '../_shared/submissionSession.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-submission-session',
}

const MAX_AUDIO_BYTES = 15 * 1024 * 1024
const MAX_COVER_BYTES = 2 * 1024 * 1024

const ALLOWED_FOLDERS = new Set(['audio', 'covers'])
const ALLOWED_EXTENSIONS: Record<string, Set<string>> = {
  audio: new Set(['mp3', 'wav', 'm4a', 'ogg', 'webm', 'aac']),
  covers: new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']),
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

  try {
    const body = (await req.json()) as {
      folder?: string
      extension?: string
      contentType?: string
      contentLength?: number
    }

    const folder = body.folder?.trim()
    const extension = body.extension?.trim().toLowerCase().replace(/^\./, '')
    const contentType = body.contentType?.trim() || 'application/octet-stream'

    if (!folder || !ALLOWED_FOLDERS.has(folder)) {
      return json({ error: 'Ungültiger Ordner.' }, 400)
    }
    if (!extension || !ALLOWED_EXTENSIONS[folder]?.has(extension)) {
      return json({ error: 'Ungültige Dateiendung.' }, 400)
    }

    const maxBytes = folder === 'audio' ? MAX_AUDIO_BYTES : MAX_COVER_BYTES
    const contentLength = body.contentLength
    if (
      typeof contentLength !== 'number' ||
      !Number.isFinite(contentLength) ||
      contentLength <= 0 ||
      contentLength > maxBytes
    ) {
      return json({ error: 'Ungültige Dateigröße.' }, 400)
    }

    const key = `${folder}/${crypto.randomUUID()}.${extension}`
    const result = await presignPutObject(key, contentType)

    return json({
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
      key: result.key,
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
