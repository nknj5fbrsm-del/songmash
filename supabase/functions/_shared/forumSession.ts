const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export type ForumSessionPayload = {
  exp: number
  n: string
  memberId?: string
}

export async function createForumSession(
  secret: string,
  options?: { memberId?: string },
): Promise<string> {
  const payload: ForumSessionPayload = {
    exp: Date.now() + SESSION_TTL_MS,
    n: crypto.randomUUID(),
    ...(options?.memberId ? { memberId: options.memberId } : {}),
  }
  const payloadPart = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadPart))
  return `${payloadPart}.${toBase64Url(new Uint8Array(sig))}`
}

export async function parseForumSession(
  token: string,
  secret: string,
): Promise<ForumSessionPayload | null> {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null

  const payloadPart = token.slice(0, dot)
  const sigPart = token.slice(dot + 1)

  try {
    const key = await hmacKey(secret)
    const sigBytes = fromBase64Url(sigPart)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(payloadPart),
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadPart))) as {
      exp?: number
      n?: string
      memberId?: string
    }
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) return null
    if (typeof payload.n !== 'string') return null

    return {
      exp: payload.exp,
      n: payload.n,
      memberId: typeof payload.memberId === 'string' ? payload.memberId : undefined,
    }
  } catch {
    return null
  }
}

export async function verifyForumSession(token: string, secret: string): Promise<boolean> {
  const payload = await parseForumSession(token, secret)
  return payload !== null
}

export function requireForumSession(req: Request): string | null {
  return req.headers.get('x-forum-session')?.trim() || null
}

export const FORUM_SESSION_TTL_SEC = SESSION_TTL_MS / 1000
