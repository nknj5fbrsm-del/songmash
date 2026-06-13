const THREAD_READ_KEY = 'songmash_forum_thread_read'
const BOARD_VISIT_KEY = 'songmash_forum_board_visit'

function readMap(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

function writeMap(key: string, map: Record<string, string>): void {
  localStorage.setItem(key, JSON.stringify(map))
}

export function readForumThreadUpdatedAt(threadId: string): string | null {
  return readMap(THREAD_READ_KEY)[threadId] ?? null
}

export function markForumThreadRead(threadId: string, updatedAt: string): void {
  const map = readMap(THREAD_READ_KEY)
  map[threadId] = updatedAt
  writeMap(THREAD_READ_KEY, map)
}

export function isForumThreadUnread(
  threadId: string,
  updatedAt: string,
  boardId?: string,
): boolean {
  const lastRead = readForumThreadUpdatedAt(threadId)
  if (lastRead) {
    return new Date(updatedAt) > new Date(lastRead)
  }
  if (boardId) {
    const lastBoardVisit = readForumBoardVisitedAt(boardId)
    if (lastBoardVisit) {
      return new Date(updatedAt) > new Date(lastBoardVisit)
    }
  }
  return false
}

export function readForumBoardVisitedAt(boardId: string): string | null {
  return readMap(BOARD_VISIT_KEY)[boardId] ?? null
}

export function markForumBoardVisited(boardId: string): void {
  const map = readMap(BOARD_VISIT_KEY)
  map[boardId] = new Date().toISOString()
  writeMap(BOARD_VISIT_KEY, map)
}

export function isForumBoardUnread(boardId: string, latestActivityAt?: string): boolean {
  if (!latestActivityAt) return false
  const lastVisit = readForumBoardVisitedAt(boardId)
  if (!lastVisit) return false
  return new Date(latestActivityAt) > new Date(lastVisit)
}
