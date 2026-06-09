import { VOTE_LIMITS, type VoteLimitErrorCode } from './voteLimits.ts'

export type RateEventRow = {
  winner: string
  created_at: string
}

export type RateLimitViolation = {
  code: VoteLimitErrorCode
  message: string
  retryAfterSec: number
}

const WINDOW_MS = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
} as const

function secondsUntil(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000))
}

function countInWindow(events: RateEventRow[], sinceMs: number, winner?: string): number {
  return events.filter((e) => {
    const t = new Date(e.created_at).getTime()
    if (t < sinceMs) return false
    if (winner && e.winner !== winner) return false
    return true
  }).length
}

function checkWindows(
  events: RateEventRow[],
  nowMs: number,
  winner: string,
): RateLimitViolation | null {
  const sinceMinute = nowMs - WINDOW_MS.minute
  const sinceHour = nowMs - WINDOW_MS.hour
  const sinceDay = nowMs - WINDOW_MS.day

  const totalMinute = countInWindow(events, sinceMinute)
  if (totalMinute >= VOTE_LIMITS.MAX_PER_MINUTE) {
    const oldest = events
      .filter((e) => new Date(e.created_at).getTime() >= sinceMinute)
      .map((e) => new Date(e.created_at).getTime())
      .sort((a, b) => a - b)[0]
    const retryAfterSec = oldest
      ? secondsUntil(oldest + WINDOW_MS.minute - nowMs)
      : 60
    return {
      code: 'RATE_MINUTE',
      message: 'Zu viele Votes in kurzer Zeit. Kurz warten.',
      retryAfterSec,
    }
  }

  const totalHour = countInWindow(events, sinceHour)
  if (totalHour >= VOTE_LIMITS.MAX_PER_HOUR) {
    return {
      code: 'RATE_HOUR',
      message: 'Stündliches Vote-Limit erreicht. Später weitermachen.',
      retryAfterSec: 300,
    }
  }

  const totalDay = countInWindow(events, sinceDay)
  if (totalDay >= VOTE_LIMITS.MAX_PER_DAY) {
    return {
      code: 'RATE_DAY',
      message: 'Tägliches Vote-Limit erreicht. Morgen geht es weiter.',
      retryAfterSec: 3600,
    }
  }

  if (winner === 'skip') {
    const skipsHour = countInWindow(events, sinceHour, 'skip')
    if (skipsHour >= VOTE_LIMITS.MAX_SKIPS_PER_HOUR) {
      return {
        code: 'SKIP_HOUR',
        message: 'Zu viele Skips in dieser Stunde.',
        retryAfterSec: 300,
      }
    }

    const skipsDay = countInWindow(events, sinceDay, 'skip')
    if (skipsDay >= VOTE_LIMITS.MAX_SKIPS_PER_DAY) {
      return {
        code: 'SKIP_DAY',
        message: 'Tägliches Skip-Limit erreicht.',
        retryAfterSec: 3600,
      }
    }
  }

  return null
}

function checkMinInterval(events: RateEventRow[], nowMs: number): RateLimitViolation | null {
  if (events.length === 0) return null
  const lastMs = new Date(events[0].created_at).getTime()
  const elapsedSec = (nowMs - lastMs) / 1000
  if (elapsedSec >= VOTE_LIMITS.MIN_INTERVAL_SEC) return null
  return {
    code: 'RATE_INTERVAL',
    message: 'Bitte einen Moment warten.',
    retryAfterSec: secondsUntil(
      VOTE_LIMITS.MIN_INTERVAL_SEC * 1000 - (nowMs - lastMs),
    ),
  }
}

function checkSkipStreakCooldown(events: RateEventRow[], nowMs: number): RateLimitViolation | null {
  if (events.length < VOTE_LIMITS.SKIP_STREAK_COUNT) return null
  const recent = events.slice(0, VOTE_LIMITS.SKIP_STREAK_COUNT)
  if (!recent.every((e) => e.winner === 'skip')) return null

  const lastMs = new Date(recent[0].created_at).getTime()
  const elapsedSec = (nowMs - lastMs) / 1000
  if (elapsedSec >= VOTE_LIMITS.SKIP_STREAK_COOLDOWN_SEC) return null

  return {
    code: 'SKIP_COOLDOWN',
    message: 'Nach mehreren Skips kurz Pause.',
    retryAfterSec: secondsUntil(
      VOTE_LIMITS.SKIP_STREAK_COOLDOWN_SEC * 1000 - (nowMs - lastMs),
    ),
  }
}

export function evaluateRateLimits(
  ipEvents: RateEventRow[],
  voterEvents: RateEventRow[],
  winner: string,
  now = Date.now(),
): RateLimitViolation | null {
  for (const events of [ipEvents, voterEvents]) {
    const interval = checkMinInterval(events, now)
    if (interval) return interval

    const streak = checkSkipStreakCooldown(events, now)
    if (streak) return streak

    const windows = checkWindows(events, now, winner)
    if (windows) return windows
  }

  return null
}

export async function fetchRecentRateEvents(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          gte: (
            col: string,
            val: string,
          ) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => {
              limit: (n: number) => Promise<{ data: RateEventRow[] | null; error: { message: string } | null }>
            }
          }
        }
      }
    }
  },
  column: 'ip_key' | 'voter_id',
  value: string,
  sinceIso: string,
  limit = 250,
): Promise<RateEventRow[]> {
  const { data, error } = await supabase
    .from('vote_rate_events')
    .select('winner, created_at')
    .eq(column, value)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function pruneOldRateEvents(
  supabase: {
    from: (table: string) => {
      delete: () => {
        lt: (col: string, val: string) => Promise<unknown>
      }
    }
  },
  olderThanIso: string,
): Promise<void> {
  await supabase.from('vote_rate_events').delete().lt('created_at', olderThanIso)
}
