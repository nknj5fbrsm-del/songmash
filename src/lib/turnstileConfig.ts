export function isTurnstileEnabled(): boolean {
  return Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim())
}

export function getTurnstileSiteKey(): string | undefined {
  return import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || undefined
}
