export const FORUM_UPLOAD_MAX_PER_HOUR = 3

async function hashSessionKey(sessionToken: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(sessionToken),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type UploadLimitSupabase = {
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

export async function recordForumUpload(
  supabase: UploadLimitSupabase,
  sessionToken: string,
  kind: 'image' | 'audio',
): Promise<void> {
  const sessionKey = await hashSessionKey(sessionToken)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  await supabase.from('forum_upload_events').delete().lt('created_at', twoHoursAgo)

  const { count, error } = await supabase
    .from('forum_upload_events')
    .select('id', { count: 'exact', head: true })
    .eq('session_key', sessionKey)
    .gte('created_at', oneHourAgo)

  if (error) throw new Error(error.message)
  if ((count ?? 0) >= FORUM_UPLOAD_MAX_PER_HOUR) {
    throw new Error('Upload-Limit erreicht (max. 3 Dateien pro Stunde).')
  }

  const { error: insertError } = await supabase.from('forum_upload_events').insert({
    session_key: sessionKey,
    kind,
  })
  if (insertError) throw new Error(insertError.message)
}
