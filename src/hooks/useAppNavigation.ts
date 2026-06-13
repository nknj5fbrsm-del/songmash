import { useCallback, useEffect, useState } from 'react'
import type { Page } from '../components/Navigation'
import {
  clearAppHash,
  initialAppPageFromHash,
  isForumAppHash,
  setForumHash,
} from '../lib/forumHashRoute'

export function useAppNavigation(initialPage: Page = 'match') {
  const [page, setPageState] = useState<Page>(() => {
    const fromHash = initialAppPageFromHash()
    return fromHash === 'forum' ? 'forum' : initialPage
  })

  const navigate = useCallback((next: Page) => {
    setPageState(next)
    if (next === 'forum') {
      if (!isForumAppHash(window.location.hash)) {
        setForumHash({ view: 'home' })
      }
    } else {
      clearAppHash()
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      if (isForumAppHash(window.location.hash)) {
        setPageState('forum')
      } else {
        setPageState((current) => (current === 'forum' ? 'match' : current))
      }
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return { page, navigate }
}
