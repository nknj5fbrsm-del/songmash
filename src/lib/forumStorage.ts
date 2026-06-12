const SESSION_KEY = 'songmash_forum_session'
const DISPLAY_NAME_KEY = 'songmash_forum_display_name'

export function readForumSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function writeForumSession(token: string): void {
  sessionStorage.setItem(SESSION_KEY, token)
}

export function clearForumSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

export function readForumDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function writeForumDisplayName(name: string): void {
  localStorage.setItem(DISPLAY_NAME_KEY, name.trim())
}
