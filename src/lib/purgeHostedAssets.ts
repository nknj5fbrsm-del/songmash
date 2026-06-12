import { moderatorHeaders } from './moderatorAuthApi'
import { isSupabaseConfigured } from './supabaseClient'

function getPurgeUrl(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) return null
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/purge-song-assets`
}

export async function purgeHostedAssets(
  audioUrl: string,
  coverUrl: string | undefined,
): Promise<void> {
  const url = getPurgeUrl()
  if (!url) return

  const res = await fetch(url, {
    method: 'POST',
    headers: moderatorHeaders(),
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      audioUrl,
      coverUrl: coverUrl ?? null,
    }),
  })

  const data = (await res.json()) as { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? 'Asset-Löschung fehlgeschlagen.')
  }
}
