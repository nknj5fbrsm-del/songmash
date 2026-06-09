/** Spiegel der Server-Limits (supabase/functions/_shared/voteLimits.ts). */
export const VOTE_LIMITS = {
  MIN_INTERVAL_SEC: 3,
  MAX_PER_MINUTE: 6,
  MAX_PER_HOUR: 80,
  MAX_PER_DAY: 200,
  MAX_SKIPS_PER_HOUR: 15,
  MAX_SKIPS_PER_DAY: 40,
  SKIP_STREAK_COUNT: 3,
  SKIP_STREAK_COOLDOWN_SEC: 30,
} as const
