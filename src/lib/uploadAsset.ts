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
  return null
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Cover konnte nicht gelesen werden.'))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Komprimierung fehlgeschlagen.'))),
      type,
      quality,
    )
  })
}

function coverOutputType(file: File): { mime: string; ext: string } {
  if (file.type === 'image/png' || file.type === 'image/webp') {
    return { mime: 'image/webp', ext: 'webp' }
  }
  return { mime: 'image/jpeg', ext: 'jpg' }
}

function coverFileName(originalName: string, ext: string): string {
  const base = originalName.replace(/\.[^.]+$/, '').trim() || 'cover'
  return `${base}.${ext}`
}

/** Verkleinert Cover-Bilder clientseitig auf max. 2 MB. */
export async function prepareCoverFile(file: File): Promise<File> {
  const typeError = validateCoverFile(file)
  if (typeError) throw new Error(typeError)
  if (file.size <= MAX_COVER_BYTES) return file

  const img = await loadImage(file)
  const { mime, ext } = coverOutputType(file)
  const name = coverFileName(file.name, ext)
  const qualities = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42]

  for (let maxDim = 1600; maxDim >= 480; maxDim = Math.round(maxDim * 0.8)) {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cover konnte nicht verarbeitet werden.')

    ctx.drawImage(img, 0, 0, width, height)

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, mime, quality)
      if (blob.size <= MAX_COVER_BYTES) {
        return new File([blob], name, { type: mime, lastModified: Date.now() })
      }
    }
  }

  throw new Error('Cover ist zu groß — auch nach Komprimierung über 2 MB.')
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName
  if (file.type === 'audio/mpeg' || file.type === 'audio/mp3') return 'mp3'
  if (file.type === 'image/jpeg') return 'jpg'
  return 'bin'
}

function normalizeAudioContentType(raw: string): string {
  const type = raw.split(';')[0].trim().toLowerCase()
  if (type === 'audio/mp3' || type === 'audio/x-mpeg') return 'audio/mpeg'
  if (type === 'audio/x-m4a') return 'audio/mp4'
  if (['audio/mpeg', 'audio/wav', 'audio/mp4'].includes(type)) return type
  return 'audio/mpeg'
}

export async function uploadAsset(file: File, folder: 'audio' | 'covers'): Promise<string> {
  if (!isSupabaseConfigured()) {
    return URL.createObjectURL(file)
  }

  const supabase = getSupabaseClient()
  const path = `${folder}/${crypto.randomUUID()}.${fileExtension(file)}`

  const contentType =
    folder === 'audio' ? normalizeAudioContentType(file.type || 'audio/mpeg') : file.type

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType,
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
