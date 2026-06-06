/**
 * Presigned PUT-URL für direkten Browser-Upload nach Cloudflare R2.
 * Deploy: supabase functions deploy r2-presign
 */

import { presignPutObject } from '../_shared/r2.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

  try {
    const body = (await req.json()) as {
      folder?: string
      extension?: string
      contentType?: string
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
