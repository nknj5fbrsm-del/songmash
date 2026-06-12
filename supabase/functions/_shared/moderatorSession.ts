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

export async function createModeratorSession(secret: string): Promise<string> {
  const payload = {
    exp: Date.now() + SESSION_TTL_MS,
    n: crypto.randomUUID(),
  }
  const payloadPart = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadPart))
  return `${payloadPart}.${toBase64Url(new Uint8Array(sig))}`
}

export async function verifyModeratorSession(token: string, secret: string): Promise<boolean> {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return false

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
    if (!valid) return false

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadPart))) as {
      exp?: number
    }
    return typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

export function requireModeratorSession(req: Request): string | null {
  return req.headers.get('x-moderator-session')?.trim() || null
}

export const MODERATOR_SESSION_TTL_SEC = SESSION_TTL_MS / 1000
