export type ForumHashRoute =
  | { view: 'home' }
  | { view: 'board'; boardId: string }
  | { view: 'thread'; threadId: string }

export function isForumAppHash(hash: string): boolean {
  const normalized = hash.replace(/^#/, '')
  return normalized === 'forum' || normalized.startsWith('forum/')
}

export function parseForumHash(hash: string): ForumHashRoute {
  const normalized = hash.replace(/^#/, '').replace(/^forum\/?/, '')
  if (!normalized) return { view: 'home' }

  const boardMatch = normalized.match(/^board\/([^/]+)$/)
  if (boardMatch) return { view: 'board', boardId: boardMatch[1] }

  const threadMatch = normalized.match(/^thread\/([^/]+)$/)
  if (threadMatch) return { view: 'thread', threadId: threadMatch[1] }

  return { view: 'home' }
}

export function buildForumHash(route: ForumHashRoute): string {
  if (route.view === 'home') return '#forum'
  if (route.view === 'board') return `#forum/board/${route.boardId}`
  return `#forum/thread/${route.threadId}`
}

export function setForumHash(route: ForumHashRoute, replace = false): void {
  const hash = buildForumHash(route)
  if (window.location.hash === hash) return

  if (replace) {
    const url = `${window.location.pathname}${window.location.search}${hash}`
    history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }

  window.location.hash = hash.slice(1)
}

export function clearAppHash(): void {
  if (!window.location.hash) return
  const url = `${window.location.pathname}${window.location.search}`
  history.replaceState(null, '', url)
}

export function initialAppPageFromHash(): 'forum' | 'match' {
  if (typeof window === 'undefined') return 'match'
  return isForumAppHash(window.location.hash) ? 'forum' : 'match'
}
