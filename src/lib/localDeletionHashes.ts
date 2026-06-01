const STORAGE_KEY = 'songmash:deletion-hashes'

export function getDeletionHashes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function setDeletionHash(songId: string, tokenHash: string): void {
  const hashes = getDeletionHashes()
  hashes[songId] = tokenHash
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hashes))
}

export function removeDeletionHash(songId: string): void {
  const hashes = getDeletionHashes()
  delete hashes[songId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hashes))
}
