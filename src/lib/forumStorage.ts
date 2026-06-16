const SESSION_KEY = 'songmash_forum_session'
const DISPLAY_NAME_KEY = 'songmash_forum_display_name'
const MEMBER_LOGIN_KEY = 'songmash_forum_is_member'

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
  localStorage.removeItem(MEMBER_LOGIN_KEY)
}

export function writeForumMemberLogin(isMember: boolean): void {
  if (isMember) {
    localStorage.setItem(MEMBER_LOGIN_KEY, '1')
  } else {
    localStorage.removeItem(MEMBER_LOGIN_KEY)
  }
}

export function readForumIsMember(): boolean {
  try {
    return localStorage.getItem(MEMBER_LOGIN_KEY) === '1'
  } catch {
    return false
  }
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
