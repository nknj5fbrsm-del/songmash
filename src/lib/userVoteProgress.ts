export const USER_VOTES_KEY = 'songmash_user_votes'
export const BADGE_EMBLEM_HIDDEN_KEY = 'songmash_badge_emblem_hidden'

export const BADGE_TIER_1 = 50
export const BADGE_TIER_2 = 100

export type BadgeTier = 0 | 1 | 2

export function readUserVoteCount(): number {
  try {
    const raw = localStorage.getItem(USER_VOTES_KEY)
    const n = parseInt(raw ?? '0', 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

export function writeUserVoteCount(count: number): void {
  localStorage.setItem(USER_VOTES_KEY, String(count))
}

export function incrementUserVoteCount(): number {
  const next = readUserVoteCount() + 1
  writeUserVoteCount(next)
  return next
}

export function getBadgeTier(count: number): BadgeTier {
  if (count >= BADGE_TIER_2) return 2
  if (count >= BADGE_TIER_1) return 1
  return 0
}

export function votesUntilNextTier(count: number): number {
  if (count < BADGE_TIER_1) return BADGE_TIER_1 - count
  if (count < BADGE_TIER_2) return BADGE_TIER_2 - count
  return 0
}

export function progressToFirstBadge(count: number): number {
  return Math.min(100, Math.round((count / BADGE_TIER_1) * 100))
}

/** 50/100-Emblem auf der Voting-Seite ausblenden (Schlaf-Badge bleibt sichtbar). */
export function readBadgeEmblemHidden(): boolean {
  try {
    return localStorage.getItem(BADGE_EMBLEM_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

export function writeBadgeEmblemHidden(hidden: boolean): void {
  try {
    localStorage.setItem(BADGE_EMBLEM_HIDDEN_KEY, hidden ? '1' : '0')
  } catch {
    // ignore
  }
}
