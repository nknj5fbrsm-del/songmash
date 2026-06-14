import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SongProvider, useSongs } from './context/SongContext'
import { WeekCompetitionProvider } from './context/WeekCompetitionContext'
import { isTurnstileEnabled } from './lib/turnstileConfig'
import { Navigation } from './components/Navigation'
import { Footer } from './components/Footer'
import { MatchPage } from './components/MatchPage'
import { LeaderboardPage } from './components/LeaderboardPage'
import { SubmitSongPage } from './components/SubmitSongPage'
import { ModerationPage } from './components/ModerationPage'
import { ImpressumPage } from './components/ImpressumPage'
import { DatenschutzPage } from './components/DatenschutzPage'
import { RemoveSongPage } from './components/RemoveSongPage'
import { ForumPage } from './components/forum/ForumPage'
import { ForumAnnouncementModal } from './components/ForumAnnouncementModal'
import { ReportContentInfoModal } from './components/ReportContentInfoModal'
import { useModerator } from './hooks/useModerator'
import { useAppNavigation } from './hooks/useAppNavigation'
import { isForumAppHash } from './lib/forumHashRoute'
import {
  dismissForumAnnouncementForVisit,
  incrementSiteVisitCount,
  shouldShowForumAnnouncement,
} from './lib/forumAnnouncementStorage'

function AppContent() {
  const { page, navigate } = useAppNavigation()
  const [reportInfoOpen, setReportInfoOpen] = useState(false)
  const [forumAnnouncementOpen, setForumAnnouncementOpen] = useState(false)
  const [forumAnnouncementVisit, setForumAnnouncementVisit] = useState<number | null>(null)
  const { isLoading, error } = useSongs()
  const { isConfigured } = useModerator()
  const announcementCheckedRef = useRef(false)

  useEffect(() => {
    if (isLoading || announcementCheckedRef.current) return
    announcementCheckedRef.current = true

    const visitCount = incrementSiteVisitCount()
    if (isForumAppHash(window.location.hash)) return
    if (shouldShowForumAnnouncement(visitCount)) {
      setForumAnnouncementVisit(visitCount)
      setForumAnnouncementOpen(true)
    }
  }, [isLoading])

  const closeForumAnnouncement = () => {
    if (forumAnnouncementVisit !== null) {
      dismissForumAnnouncementForVisit(forumAnnouncementVisit)
    }
    setForumAnnouncementOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-lime-400" />
          Songs werden geladen…
        </div>
      </div>
    )
  }

  return (
    <WeekCompetitionProvider>
    <div className="flex min-h-screen flex-col bg-neutral-950">
      {page !== 'moderation' &&
        page !== 'impressum' &&
        page !== 'datenschutz' &&
        page !== 'remove-song' && (
        <Navigation current={page} onNavigate={navigate} />
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {error && <div className="alert-error mb-6">{error}</div>}

        {page === 'match' && <MatchPage />}
        {page === 'leaderboard' && <LeaderboardPage />}
        {page === 'forum' && <ForumPage />}
        {isTurnstileEnabled() ? (
          <div
            className={
              page !== 'submit'
                ? 'pointer-events-none fixed -left-[10000px] top-0 w-full max-w-2xl opacity-0'
                : undefined
            }
            aria-hidden={page !== 'submit'}
          >
            <SubmitSongPage isActive={page === 'submit'} onLeave={() => navigate('match')} />
          </div>
        ) : (
          page === 'submit' && (
            <SubmitSongPage isActive onLeave={() => navigate('match')} />
          )
        )}
        {page === 'moderation' && <ModerationPage onBack={() => navigate('match')} />}
        {page === 'impressum' && <ImpressumPage onBack={() => navigate('match')} />}
        {page === 'datenschutz' && <DatenschutzPage onBack={() => navigate('match')} />}
        {page === 'remove-song' && <RemoveSongPage onBack={() => navigate('match')} />}
      </main>
      <Footer
        padForMobileVoteDock={page === 'match'}
        padForForumStickyNav={page === 'forum'}
        showModeration={isConfigured}
        onModeration={() => navigate('moderation')}
        onForum={() => navigate('forum')}
        onImpressum={() => navigate('impressum')}
        onDatenschutz={() => navigate('datenschutz')}
        onRemoveSong={() => navigate('remove-song')}
        onReportInfo={() => setReportInfoOpen(true)}
      />
      <ReportContentInfoModal open={reportInfoOpen} onClose={() => setReportInfoOpen(false)} />
      <ForumAnnouncementModal
        open={forumAnnouncementOpen}
        onClose={closeForumAnnouncement}
        onOpenForum={() => navigate('forum')}
      />
    </div>
    </WeekCompetitionProvider>
  )
}

export default function App() {
  return (
    <SongProvider>
      <AppContent />
    </SongProvider>
  )
}

