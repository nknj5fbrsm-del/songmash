import { getR2PublicBaseUrl } from './assetConfig'

const SUPABASE_BUCKET = 'song-assets'
const SUPABASE_PUBLIC_MARKER = `/storage/v1/object/public/${SUPABASE_BUCKET}/`

export type HostedAssetProvider = 'r2' | 'supabase'

export type ParsedHostedAsset = {
  provider: HostedAssetProvider
  key: string
}

export function getSupabaseStoragePathFromUrl(url: string): string | null {
  const idx = url.indexOf(SUPABASE_PUBLIC_MARKER)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + SUPABASE_PUBLIC_MARKER.length).split('?')[0])
}

function normalizePublicUrl(url: string): string {
  return url.trim().split('?')[0].replace(/\/$/, '')
}

export function getR2KeyFromUrl(url: string, publicBase = getR2PublicBaseUrl()): string | null {
  const base = publicBase.replace(/\/$/, '')
  const normalizedUrl = normalizePublicUrl(url)
  if (!normalizedUrl.startsWith(base)) return null
  const key = normalizedUrl.slice(base.length).replace(/^\//, '')
  return key ? decodeURIComponent(key) : null
}

export function parseHostedAssetUrl(url: string): ParsedHostedAsset | null {
  const r2Key = getR2KeyFromUrl(url)
  if (r2Key) return { provider: 'r2', key: r2Key }

  const supabasePath = getSupabaseStoragePathFromUrl(url)
  if (supabasePath) return { provider: 'supabase', key: supabasePath }

  return null
}

export function isR2AssetUrl(url: string): boolean {
  return getR2KeyFromUrl(url) !== null
}

export function isSupabaseAssetUrl(url: string): boolean {
  return getSupabaseStoragePathFromUrl(url) !== null
}

export function isHostedAssetUrl(url: string): boolean {
  return parseHostedAssetUrl(url) !== null
}

export function collectHostedAssetKeys(song: {
  audioUrl: string
  coverUrl?: string
}): ParsedHostedAsset[] {
  const items: ParsedHostedAsset[] = []
  const audio = parseHostedAssetUrl(song.audioUrl)
  if (audio) items.push(audio)
  if (song.coverUrl) {
    const cover = parseHostedAssetUrl(song.coverUrl)
    if (cover) items.push(cover)
  }
  return items
}

/** Nur Supabase-Pfade (Legacy-Cleanup). */
export function collectStoragePaths(song: {
  audioUrl: string
  coverUrl?: string
}): string[] {
  return collectHostedAssetKeys(song)
    .filter((a) => a.provider === 'supabase')
    .map((a) => a.key)
}

export { SUPABASE_BUCKET as STORAGE_BUCKET }
