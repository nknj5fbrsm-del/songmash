const SESSION_KEY = 'songmash_moderator_session'

export function readModeratorSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function writeModeratorSession(token: string): void {
  sessionStorage.setItem(SESSION_KEY, token)
}

export function clearModeratorSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

export function hasModeratorSession(): boolean {
  return Boolean(readModeratorSession()?.trim())
}
