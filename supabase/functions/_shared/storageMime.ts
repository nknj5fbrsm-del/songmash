/** Normalisiert MIME-Types für Supabase Storage (Bucket erlaubt audio/mpeg, nicht audio/mp3). */
export function normalizeAudioContentType(raw: string | null | undefined): string {
  const type = (raw ?? 'audio/mpeg').split(';')[0].trim().toLowerCase()
  if (type === 'audio/mp3' || type === 'audio/x-mpeg') return 'audio/mpeg'
  if (type === 'audio/x-m4a') return 'audio/mp4'
  if (['audio/mpeg', 'audio/wav', 'audio/mp4'].includes(type)) return type
  return 'audio/mpeg'
}
