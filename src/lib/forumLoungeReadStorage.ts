const LOUNGE_LAST_SEEN_KEY = 'songmash_forum_lounge_last_seen'

export function readForumLoungeLastSeenAt(): string | null {
  try {
    return localStorage.getItem(LOUNGE_LAST_SEEN_KEY)
  } catch {
    return null
  }
}

export function markForumLoungeRead(latestCreatedAt: string): void {
  try {
    localStorage.setItem(LOUNGE_LAST_SEEN_KEY, latestCreatedAt)
  } catch {
    // ignore
  }
}

export function latestLoungeCreatedAt(messages: { createdAt: string }[]): string | null {
  if (messages.length === 0) return null
  return messages[messages.length - 1].createdAt
}
