const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export async function hashForumAccessCode(code: string): Promise<string> {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateForumAccessCode(): string {
  const part = () =>
    Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(
      '',
    )
  return `SM-${part()}-${part()}`
}

export function normalizeForumAccessCodeInput(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

type MemberRow = {
  id: string
  display_name: string
  is_active: boolean
}

type MemberLookupSupabase = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        maybeSingle: () => Promise<{ data: MemberRow | null; error: { message: string } | null }>
      }
    }
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>
    }
  }
}

export async function findForumMemberByAccessCode(
  supabase: MemberLookupSupabase,
  code: string,
): Promise<MemberRow | null> {
  const hash = await hashForumAccessCode(code)
  const { data, error } = await supabase
    .from('forum_members')
    .select('id, display_name, is_active')
    .eq('access_code_hash', hash)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function touchForumMemberLastSeen(
  supabase: MemberLookupSupabase,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from('forum_members')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', memberId)
  if (error) throw new Error(error.message)
}
