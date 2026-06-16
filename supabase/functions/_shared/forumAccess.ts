import { parseForumSession } from './forumSession.ts'

export type ForumAccess =
  | { kind: 'legacy' }
  | { kind: 'member'; memberId: string; displayName: string }

type AccessSupabase = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        maybeSingle: () => Promise<{
          data: { display_name: string; is_active: boolean } | null
          error: { message: string } | null
        }>
      }
    }
  }
}

export async function resolveForumAccess(
  sessionToken: string,
  forumSecret: string,
  supabase: AccessSupabase,
): Promise<ForumAccess> {
  const payload = await parseForumSession(sessionToken, forumSecret)
  if (!payload) {
    throw new ForumAccessError('Forum-Session ungültig oder abgelaufen. Bitte erneut anmelden.', 401)
  }

  if (!payload.memberId) {
    return { kind: 'legacy' }
  }

  const { data: member, error } = await supabase
    .from('forum_members')
    .select('display_name, is_active')
    .eq('id', payload.memberId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!member) {
    throw new ForumAccessError('Forum-Zugang nicht mehr gültig. Bitte erneut anmelden.', 401)
  }
  if (!member.is_active) {
    throw new ForumAccessError('Dein Forum-Zugang wurde gesperrt.', 403)
  }

  return {
    kind: 'member',
    memberId: payload.memberId,
    displayName: member.display_name,
  }
}

export class ForumAccessError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ForumAccessError'
    this.status = status
  }
}

export function resolveAuthorName(
  access: ForumAccess,
  authorName: string | undefined,
  trimAuthor: (name: string | undefined) => string,
): string {
  if (access.kind === 'member') return access.displayName
  return trimAuthor(authorName)
}

export function assertOwnAuthor(
  access: ForumAccess,
  authorNameInDb: string,
  authorName: string | undefined,
  trimAuthor: (name: string | undefined) => string,
): void {
  const claimed = resolveAuthorName(access, authorName, trimAuthor)
  if (authorNameInDb !== claimed) {
    throw new Error('Du kannst nur eigene Beiträge bearbeiten oder löschen.')
  }
}
