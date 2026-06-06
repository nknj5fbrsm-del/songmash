import { getR2PublicBaseUrl, isR2Configured } from './assetConfig'
import { submissionSessionHeaders } from './submissionSession'
import { isSupabaseConfigured } from './supabaseClient'

function getPresignUrl(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) return null
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/r2-presign`
}

function authHeaders(): Record<string, string> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`
    headers.apikey = anonKey
  }
  return headers
}

export async function uploadToR2(
  file: File,
  folder: 'audio' | 'covers',
  extension: string,
  contentType: string,
): Promise<string> {
  const presignUrl = getPresignUrl()
  if (!presignUrl) {
    throw new Error('R2-Upload ist nicht konfiguriert (Supabase fehlt).')
  }

  const presignRes = await fetch(presignUrl, {
    method: 'POST',
    headers: { ...authHeaders(), ...submissionSessionHeaders() },
    body: JSON.stringify({
      folder,
      extension,
      contentType,
      contentLength: file.size,
    }),
  })

  const presignData = (await presignRes.json()) as {
    uploadUrl?: string
    publicUrl?: string
    error?: string
  }

  if (!presignRes.ok || !presignData.uploadUrl || !presignData.publicUrl) {
    throw new Error(presignData.error ?? 'R2-Presign fehlgeschlagen.')
  }

  const putRes = await fetch(presignData.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })

  if (!putRes.ok) {
    throw new Error(`R2-Upload fehlgeschlagen (${putRes.status}).`)
  }

  return presignData.publicUrl
}

export function shouldUseR2Upload(): boolean {
  return isSupabaseConfigured() && isR2Configured()
}

export function getR2PublicUrlForKey(key: string): string {
  return `${getR2PublicBaseUrl()}/${key}`
}
