/** Öffentliche R2-Basis-URL — im Build überschreibbar via VITE_R2_PUBLIC_URL. */
export const DEFAULT_R2_PUBLIC_URL =
  'https://pub-a6d3efc7833c4556b272d9c2695e3d17.r2.dev'

export function getR2PublicBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_R2_PUBLIC_URL?.trim()
  return (fromEnv || DEFAULT_R2_PUBLIC_URL).replace(/\/$/, '')
}

export function isR2Configured(): boolean {
  return Boolean(getR2PublicBaseUrl())
}
