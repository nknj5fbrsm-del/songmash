const SKIP_UNTIL_KEY = 'songmash_skip_cooldown_until'
const RATE_UNTIL_KEY = 'songmash_vote_rate_limit_until'
const RATE_MSG_KEY = 'songmash_vote_rate_limit_message'

function readTimestamp(key: string): number {
  try {
    const raw = localStorage.getItem(key)
    const n = parseInt(raw ?? '0', 10)
    if (!Number.isFinite(n) || n <= Date.now()) {
      if (n > 0) localStorage.removeItem(key)
      return 0
    }
    return n
  } catch {
    return 0
  }
}

function writeTimestamp(key: string, until: number): void {
  try {
    if (until <= Date.now()) localStorage.removeItem(key)
    else localStorage.setItem(key, String(until))
  } catch {
    // ignore
  }
}

export function readSkipCooldownUntil(): number {
  return readTimestamp(SKIP_UNTIL_KEY)
}

export function writeSkipCooldownUntil(until: number): void {
  writeTimestamp(SKIP_UNTIL_KEY, until)
}

export function readVoteRateLimitUntil(): number {
  return readTimestamp(RATE_UNTIL_KEY)
}

export function writeVoteRateLimitUntil(until: number, message?: string | null): void {
  writeTimestamp(RATE_UNTIL_KEY, until)
  try {
    if (until <= Date.now() || !message) localStorage.removeItem(RATE_MSG_KEY)
    else localStorage.setItem(RATE_MSG_KEY, message)
  } catch {
    // ignore
  }
}

export function readVoteRateLimitMessage(): string | null {
  if (readVoteRateLimitUntil() <= Date.now()) return null
  try {
    return localStorage.getItem(RATE_MSG_KEY)
  } catch {
    return null
  }
}

export function isVoteRateLimitActive(): boolean {
  return readVoteRateLimitUntil() > Date.now()
}

export function clearVoteRateLimitStorage(): void {
  writeVoteRateLimitUntil(0)
}
