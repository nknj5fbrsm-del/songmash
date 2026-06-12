import { useCallback, useState } from 'react'
import { moderatorLogin } from '../lib/moderatorAuthApi'
import { clearModeratorSession, hasModeratorSession } from '../lib/moderatorStorage'
import { isSupabaseConfigured } from '../lib/supabaseClient'

export function useModerator() {
  const [unlocked, setUnlocked] = useState(() => hasModeratorSession())

  const unlock = useCallback(async (key: string) => {
    try {
      await moderatorLogin(key)
      setUnlocked(true)
      return true
    } catch {
      return false
    }
  }, [])

  const lock = useCallback(() => {
    clearModeratorSession()
    setUnlocked(false)
  }, [])

  return {
    unlocked,
    unlock,
    lock,
    isConfigured: isSupabaseConfigured(),
  }
}
