import { isSupabaseConfigured } from './supabaseClient'

function getPurgeUrl(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) return null
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/purge-song-assets`
}

export async function purgeHostedAssets(
  audioUrl: string,
  coverUrl: string | undefined,
  moderatorKey: string,
): Promise<void> {
  const url = getPurgeUrl()
  if (!url) return

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`
    headers.apikey = anonKey
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      audioUrl,
      coverUrl: coverUrl ?? null,
      moderatorKey,
    }),
  })

  const data = (await res.json()) as { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? 'Asset-Löschung fehlgeschlagen.')
  }
}
