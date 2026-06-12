import { ForumApiError, forumHeaders } from './forumApi'
import { isSupabaseConfigured } from './supabaseClient'

export const FORUM_MAX_AUDIO_BYTES = 15 * 1024 * 1024
export const FORUM_MAX_IMAGE_BYTES = 2 * 1024 * 1024

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/mp3', 'audio/ogg']

function presignBaseUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) {
    throw new ForumApiError('Forum-Upload ist nicht konfiguriert.', 503)
  }
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/forum-upload-presign`
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/gif') return 'gif'
  if (file.type === 'audio/wav') return 'wav'
  if (file.type === 'audio/mp4' || file.type === 'audio/x-m4a') return 'm4a'
  if (file.type === 'audio/ogg') return 'ogg'
  return 'mp3'
}

export function validateForumImageFile(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type) && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    return 'Bitte ein Bild (.jpg, .png, .webp, .gif) wählen.'
  }
  if (file.size > FORUM_MAX_IMAGE_BYTES) {
    return 'Bild ist zu groß (max. 2 MB).'
  }
  return null
}

export function validateForumAudioFile(file: File): string | null {
  if (!AUDIO_TYPES.includes(file.type) && !/\.(mp3|wav|m4a|ogg)$/i.test(file.name)) {
    return 'Bitte eine Audio-Datei (.mp3, .wav, .m4a, .ogg) wählen.'
  }
  if (file.size > FORUM_MAX_AUDIO_BYTES) {
    return 'Audio-Datei ist zu groß (max. 15 MB).'
  }
  return null
}

export async function uploadForumAttachment(
  file: File,
  kind: 'image' | 'audio',
): Promise<string> {
  const extension = fileExtension(file)
  const contentType = file.type || (kind === 'image' ? 'image/jpeg' : 'audio/mpeg')

  const presignRes = await fetch(presignBaseUrl(), {
    method: 'POST',
    headers: forumHeaders(),
    body: JSON.stringify({
      kind,
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
    throw new ForumApiError(presignData.error ?? 'Upload-Vorbereitung fehlgeschlagen.', presignRes.status)
  }

  const putRes = await fetch(presignData.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })

  if (!putRes.ok) {
    throw new ForumApiError(`Upload fehlgeschlagen (${putRes.status}).`, putRes.status)
  }

  return presignData.publicUrl
}
