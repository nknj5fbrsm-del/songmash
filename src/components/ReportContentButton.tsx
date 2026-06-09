import { useState, useSyncExternalStore } from 'react'
import { Flag } from 'lucide-react'
import { hasReportedSong } from '../lib/contentReportStorage'
import type { ContentReportContext } from '../lib/buildContentReportMailto'
import type { Song } from '../types/song'
import { ReportContentModal } from './ReportContentModal'

function subscribeReported(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener('songmash-report-updated', onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener('songmash-report-updated', onStoreChange)
  }
}

function useHasReported(songId: string): boolean {
  return useSyncExternalStore(
    subscribeReported,
    () => hasReportedSong(songId),
    () => false,
  )
}

interface ReportContentButtonProps {
  song: Pick<Song, 'id' | 'title' | 'artist'>
  context: ContentReportContext
  className?: string
}

export function ReportContentButton({ song, context, className }: ReportContentButtonProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [reported, setReported] = useState(() => hasReportedSong(song.id))
  const alreadyReported = useHasReported(song.id) || reported

  const handleReported = () => {
    setReported(true)
    window.dispatchEvent(new Event('songmash-report-updated'))
  }

  if (alreadyReported) {
    return (
      <p className={`text-xs text-neutral-600 ${className ?? ''}`}>
        <Flag className="mr-1 inline h-3 w-3 opacity-50" aria-hidden />
        Bereits gemeldet
      </p>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-300 ${className ?? ''}`}
      >
        <Flag className="h-3.5 w-3.5 shrink-0 text-neutral-600" aria-hidden />
        Inhalt melden
      </button>

      <ReportContentModal
        open={modalOpen}
        song={song}
        context={context}
        onClose={() => setModalOpen(false)}
        onReported={handleReported}
      />
    </>
  )
}
