function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function hashDeletionToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token.trim())
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function createDeletionToken(): Promise<{ token: string; tokenHash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const token = toBase64Url(bytes)
  const tokenHash = await hashDeletionToken(token)
  return { token, tokenHash }
}
