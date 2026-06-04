import { useState } from 'react'
import { Clock, Crown, Info, Music2 } from 'lucide-react'
import { useWeekCompetitionContext } from '../context/WeekCompetitionContext'
import type { Song } from '../types/song'
import { WeekCompetitionInfoModal } from './WeekCompetitionInfoModal'

function CoverThumb({ song }: { song: Song | null | undefined }) {
  if (song?.coverUrl) {
    return (
      <img
        src={song.coverUrl}
        alt=""
        className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-lime-400/20"
      />
    )
  }

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-800/80 ring-1 ring-neutral-800"
      aria-hidden
    >
      <Music2 className="h-4 w-4 text-neutral-600" />
    </div>
  )
}

function SongRow({ song, emptyText }: { song: Song | null | undefined; emptyText: string }) {
  if (!song) {
    return <p className="text-sm text-neutral-600">{emptyText}</p>
  }

  return (
    <div className="flex max-w-full items-center justify-center gap-2 text-sm">
      <span className="max-w-[5.5rem] truncate text-neutral-500 sm:max-w-[7rem]">{song.artist}</span>
      <span className="shrink-0 text-neutral-700" aria-hidden>
        ·
      </span>
      <CoverThumb song={song} />
      <span className="shrink-0 text-neutral-700" aria-hidden>
        ·
      </span>
      <span className="max-w-[5.5rem] truncate font-medium text-neutral-100 sm:max-w-[7rem]">
        {song.title}
      </span>
    </div>
  )
}

function ContenderColumn({
  heading,
  song,
  emptyText,
}: {
  heading: string
  song: Song | null | undefined
  emptyText: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{heading}</p>
      <SongRow song={song} emptyText={emptyText} />
    </div>
  )
}

interface WeekCompetitionStripProps {
  className?: string
}

export function WeekCompetitionStrip({ className }: WeekCompetitionStripProps) {
  const {
    enabled,
    loading,
    display,
    currentLeader,
    mvpCandidate,
  } = useWeekCompetitionContext()
  const [infoOpen, setInfoOpen] = useState(false)

  if (!enabled || loading) return null

  return (
    <>
      <div
        className={`mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-lime-400/15 bg-lime-400/[0.04] ${className ?? ''}`}
        aria-label="Song der Woche"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-lime-400/10 px-3 py-2.5 text-sm">
          <Crown className="h-4 w-4 shrink-0 text-lime-400" aria-hidden />
          <span className="font-medium text-lime-300/90">Song der Woche</span>
          <span className="text-lime-400/25" aria-hidden>
            ·
          </span>
          <span className="text-neutral-400">KW {display.weekNumber}</span>
          <span className="text-lime-400/25" aria-hidden>
            ·
          </span>
          <span className="inline-flex items-center gap-1 text-neutral-400">
            <Clock className="h-3.5 w-3.5 text-lime-400/70" aria-hidden />
            {display.isEnded ? (
              <span>Woche endet …</span>
            ) : (
              <span>
                noch <span className="tabular-nums text-neutral-300">{display.countdownLabel}</span>
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="ml-0.5 inline-flex rounded-md p-0.5 text-neutral-500 transition-colors hover:text-lime-400 sm:ml-1"
            aria-label="Song der Woche erklären"
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr]">
          <ContenderColumn
            heading="Momentan Platz 1"
            song={currentLeader}
            emptyText="—"
          />

          <div
            className="hidden w-px shrink-0 bg-neutral-800 sm:block"
            aria-hidden
          />

          <div className="h-px shrink-0 bg-neutral-800 sm:hidden" aria-hidden />

          <ContenderColumn
            heading="Aufsteiger der Woche"
            song={mvpCandidate?.song}
            emptyText="min. 3 Votes"
          />
        </div>
      </div>

      <WeekCompetitionInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  )
}
