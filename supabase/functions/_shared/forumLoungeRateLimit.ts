export const FORUM_LOUNGE_MIN_INTERVAL_MS = 3_000
export const FORUM_LOUNGE_MAX_PER_HOUR = 30

async function hashSessionKey(sessionToken: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(sessionToken),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type LoungeRateSupabase = {
  from: (table: string) => {
    select: (
      cols: string,
      opts?: { count?: 'exact'; head?: boolean },
    ) => {
      eq: (
        col: string,
        val: string,
      ) => {
        gte: (
          col: string,
          val: string,
        ) => Promise<{ count: number | null; error: { message: string } | null }>
      }
    }
    insert: (row: unknown) => Promise<{ error: { message: string } | null }>
    delete: () => { lt: (col: string, val: string) => Promise<unknown> }
  }
}

export async function assertForumLoungeRateLimit(
  supabase: LoungeRateSupabase,
  sessionToken: string,
): Promise<void> {
  const sessionKey = await hashSessionKey(sessionToken)
  const now = Date.now()
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString()
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString()

  await supabase.from('forum_lounge_rate_events').delete().lt('created_at', twoHoursAgo)

  const { count, error } = await supabase
    .from('forum_lounge_rate_events')
    .select('id', { count: 'exact', head: true })
    .eq('session_key', sessionKey)
    .gte('created_at', oneHourAgo)

  if (error) throw new Error(error.message)
  if ((count ?? 0) >= FORUM_LOUNGE_MAX_PER_HOUR) {
    throw new Error('Chat-Limit erreicht (max. 30 Nachrichten pro Stunde).')
  }

  const minIntervalAgo = new Date(now - FORUM_LOUNGE_MIN_INTERVAL_MS).toISOString()
  const { count: recentCount, error: recentError } = await supabase
    .from('forum_lounge_rate_events')
    .select('id', { count: 'exact', head: true })
    .eq('session_key', sessionKey)
    .gte('created_at', minIntervalAgo)

  if (recentError) throw new Error(recentError.message)
  if ((recentCount ?? 0) > 0) {
    throw new Error('Bitte kurz warten, bevor du die nächste Nachricht sendest.')
  }
}

export async function recordForumLoungeMessage(
  supabase: LoungeRateSupabase,
  sessionToken: string,
): Promise<void> {
  const sessionKey = await hashSessionKey(sessionToken)
  const { error } = await supabase.from('forum_lounge_rate_events').insert({
    session_key: sessionKey,
  })
  if (error) throw new Error(error.message)
}
