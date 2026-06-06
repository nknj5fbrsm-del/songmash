import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { collectHostedAssets } from './assetUrls.ts'
import { deleteR2Keys } from './r2.ts'

const SUPABASE_BUCKET = 'song-assets'

export async function purgeHostedAssetsForRow(row: {
  audio_url: string
  cover_url: string | null
}): Promise<void> {
  const assets = collectHostedAssets(row)
  const r2Keys = assets.filter((a) => a.provider === 'r2').map((a) => a.key)
  const supabasePaths = assets.filter((a) => a.provider === 'supabase').map((a) => a.key)

  if (assets.length === 0) {
    console.warn('purge: keine Assets erkannt', { audio_url: row.audio_url })
  }

  if (r2Keys.length > 0) {
    console.log('purge: R2 keys', r2Keys)
    await deleteR2Keys(r2Keys)
  }

  if (supabasePaths.length > 0) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase-Konfiguration fehlt für Storage-Cleanup.')
    }
    const supabase = createClient(supabaseUrl, serviceKey)
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove(supabasePaths)
    if (error) console.warn('Supabase storage cleanup:', error.message)
  }
}
