import { useCallback, useState } from 'react'

const SESSION_KEY = 'songmash:moderator'

export function useModerator() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1',
  )

  const moderatorKey = import.meta.env.VITE_MODERATOR_KEY as string | undefined
  const isConfigured = Boolean(moderatorKey)

  const unlock = useCallback(
    (key: string) => {
      if (!moderatorKey || key !== moderatorKey) return false
      sessionStorage.setItem(SESSION_KEY, '1')
      setUnlocked(true)
      return true
    },
    [moderatorKey],
  )

  const lock = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setUnlocked(false)
  }, [])

  return { unlocked, unlock, lock, isConfigured }
}
