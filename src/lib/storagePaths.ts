const BUCKET = 'song-assets'
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`

export function getStoragePathFromPublicUrl(url: string): string | null {
  const idx = url.indexOf(PUBLIC_MARKER)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + PUBLIC_MARKER.length).split('?')[0])
}

export function collectStoragePaths(song: {
  audioUrl: string
  coverUrl?: string
}): string[] {
  const paths = [getStoragePathFromPublicUrl(song.audioUrl)]
  if (song.coverUrl) paths.push(getStoragePathFromPublicUrl(song.coverUrl))
  return paths.filter((p): p is string => Boolean(p))
}

export { BUCKET as STORAGE_BUCKET }
