import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SongProvider, useSongs } from './context/SongContext'
import { Navigation, type Page } from './components/Navigation'
import { Footer } from './components/Footer'
import { MatchPage } from './components/MatchPage'
import { LeaderboardPage } from './components/LeaderboardPage'
import { SubmitSongPage } from './components/SubmitSongPage'
import { ModerationPage } from './components/ModerationPage'
import { ImpressumPage } from './components/ImpressumPage'
import { DatenschutzPage } from './components/DatenschutzPage'
import { RemoveSongPage } from './components/RemoveSongPage'
import { useModerator } from './hooks/useModerator'

function AppContent() {
  const [page, setPage] = useState<Page>('match')
  const { isLoading, error } = useSongs()
  const { isConfigured } = useModerator()

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
    <div className="flex min-h-screen flex-col bg-neutral-950">
      {page !== 'moderation' &&
        page !== 'impressum' &&
        page !== 'datenschutz' &&
        page !== 'remove-song' && (
        <Navigation current={page} onNavigate={setPage} />
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {error && <div className="alert-error mb-6">{error}</div>}

        {page === 'match' && <MatchPage />}
        {page === 'leaderboard' && <LeaderboardPage />}
        {page === 'submit' && <SubmitSongPage />}
        {page === 'moderation' && <ModerationPage onBack={() => setPage('match')} />}
        {page === 'impressum' && <ImpressumPage onBack={() => setPage('match')} />}
        {page === 'datenschutz' && <DatenschutzPage onBack={() => setPage('match')} />}
        {page === 'remove-song' && <RemoveSongPage onBack={() => setPage('match')} />}
      </main>
      <Footer
        showModeration={isConfigured}
        onModeration={() => setPage('moderation')}
        onImpressum={() => setPage('impressum')}
        onDatenschutz={() => setPage('datenschutz')}
        onRemoveSong={() => setPage('remove-song')}
      />
    </div>
  )
}

export default function App() {
  return (
    <SongProvider>
      <AppContent />
    </SongProvider>
  )
}
