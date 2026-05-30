import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'

const BUCKET = 'song-assets'

const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/mp3']
const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024
export const MAX_COVER_BYTES = 2 * 1024 * 1024
export const MAX_DESCRIPTION_LENGTH = 280

export function validateAudioFile(file: File): string | null {
  if (!AUDIO_TYPES.includes(file.type) && !/\.(mp3|wav|m4a)$/i.test(file.name)) {
    return 'Bitte eine Audio-Datei (.mp3, .wav, .m4a) wählen.'
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return 'Audio-Datei ist zu groß (max. 15 MB).'
  }
  return null
}

export function validateCoverFile(file: File): string | null {
  if (!COVER_TYPES.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    return 'Bitte ein Bild (.jpg, .png, .webp) wählen.'
  }
  if (file.size > MAX_COVER_BYTES) {
    return 'Cover ist zu groß (max. 2 MB).'
  }
  return null
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName
  if (file.type === 'audio/mpeg') return 'mp3'
  if (file.type === 'image/jpeg') return 'jpg'
  return 'bin'
}

export async function uploadAsset(file: File, folder: 'audio' | 'covers'): Promise<string> {
  if (!isSupabaseConfigured()) {
    return URL.createObjectURL(file)
  }

  const supabase = getSupabaseClient()
  const path = `${folder}/${crypto.randomUUID()}.${fileExtension(file)}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(`Upload fehlgeschlagen: ${error.message}`)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function resolveCoverUrl(coverFile: File | null): Promise<string | undefined> {
  if (!coverFile) return undefined
  return uploadAsset(coverFile, 'covers')
}

export async function resolveAudioFromFile(audioFile: File): Promise<string> {
  return uploadAsset(audioFile, 'audio')
}
