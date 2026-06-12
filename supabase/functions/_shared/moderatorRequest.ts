import { requireModeratorSession, verifyModeratorSession } from './moderatorSession.ts'

export async function isModeratorRequest(req: Request): Promise<boolean> {
  const secret = Deno.env.get('MODERATOR_KEY')?.trim()
  if (!secret) return false

  const token = requireModeratorSession(req)
  if (!token) return false

  return verifyModeratorSession(token, secret)
}

export async function requireModeratorRequest(req: Request): Promise<void> {
  if (!(await isModeratorRequest(req))) {
    throw new Error('Moderator-Session ungültig oder abgelaufen.')
  }
}
