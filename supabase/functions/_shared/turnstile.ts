export async function verifyTurnstileToken(
  token: string,
  secret: string,
  remoteIp?: string | null,
): Promise<boolean> {
  const body = new URLSearchParams({
    secret,
    response: token,
  })
  if (remoteIp) body.set('remoteip', remoteIp)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) return false

  const data = (await res.json()) as { success?: boolean }
  return data.success === true
}

export function clientIp(req: Request): string | null {
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
