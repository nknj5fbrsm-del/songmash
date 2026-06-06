const SUPABASE_BUCKET = 'song-assets'
const SUPABASE_PUBLIC_MARKER = `/storage/v1/object/public/${SUPABASE_BUCKET}/`

export type HostedAssetProvider = 'r2' | 'supabase'

export type ParsedHostedAsset = {
  provider: HostedAssetProvider
  key: string
}

export function getR2PublicBase(): string {
  const base = Deno.env.get('R2_PUBLIC_BASE_URL')?.trim()
  if (!base) throw new Error('R2_PUBLIC_BASE_URL fehlt.')
  return base.replace(/\/$/, '')
}

export function getSupabaseStoragePathFromUrl(url: string): string | null {
  const idx = url.indexOf(SUPABASE_PUBLIC_MARKER)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + SUPABASE_PUBLIC_MARKER.length).split('?')[0])
}

function normalizePublicUrl(url: string): string {
  return url.trim().split('?')[0].replace(/\/$/, '')
}

export function getR2KeyFromUrl(url: string): string | null {
  const base = getR2PublicBase()
  const normalizedUrl = normalizePublicUrl(url)
  if (!normalizedUrl.startsWith(base)) return null
  const key = normalizedUrl.slice(base.length).replace(/^\//, '')
  return key ? decodeURIComponent(key) : null
}

export function parseHostedAssetUrl(url: string): ParsedHostedAsset | null {
  try {
    const r2Key = getR2KeyFromUrl(url)
    if (r2Key) return { provider: 'r2', key: r2Key }
  } catch {
    // R2 nicht konfiguriert — nur Supabase prüfen
  }

  const supabasePath = getSupabaseStoragePathFromUrl(url)
  if (supabasePath) return { provider: 'supabase', key: supabasePath }

  return null
}

export function collectHostedAssets(row: {
  audio_url: string
  cover_url: string | null
}): ParsedHostedAsset[] {
  const items: ParsedHostedAsset[] = []
  const audio = parseHostedAssetUrl(row.audio_url)
  if (audio) items.push(audio)
  if (row.cover_url) {
    const cover = parseHostedAssetUrl(row.cover_url)
    if (cover) items.push(cover)
  }
  return items
}
