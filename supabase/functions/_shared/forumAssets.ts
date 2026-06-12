import { getR2KeyFromUrl } from './assetUrls.ts'
import { deleteR2Keys } from './r2.ts'

export function parseForumAttachmentKey(url: string): string | null {
  const key = getR2KeyFromUrl(url)
  if (!key) return null
  if (key.startsWith('forum/images/') || key.startsWith('forum/audio/')) {
    return key
  }
  return null
}

export function normalizeForumAttachmentUrl(url: string | undefined | null): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  if (!parseForumAttachmentKey(trimmed)) {
    throw new Error('Ungültige Forum-Anhang-URL.')
  }
  return trimmed
}

export async function purgeForumAttachments(row: {
  image_url?: string | null
  audio_url?: string | null
}): Promise<void> {
  const keys: string[] = []
  if (row.image_url) {
    const key = parseForumAttachmentKey(row.image_url)
    if (key) keys.push(key)
  }
  if (row.audio_url) {
    const key = parseForumAttachmentKey(row.audio_url)
    if (key) keys.push(key)
  }
  if (keys.length > 0) {
    await deleteR2Keys(keys)
  }
}
