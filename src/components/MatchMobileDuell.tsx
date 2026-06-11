import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Music2, Shuffle, ThumbsUp } from 'lucide-react'
import { getPlayableAudioUrl } from '../lib/audioProxy'
import type { Song } from '../types/song'
import { ReportContentButton } from './ReportContentButton'

interface MatchMobileDuellProps {
  songA: Song
  songB: Song
  userVoteCount: number
  voteDisabled: boolean
  skipInactive: boolean
  skipInactiveSec: number
  onVote: (side: 'A' | 'B') => void
  onSkip: () => void
}

function DuellSide({
  side,
  song,
  active,
  onSelect,
}: {
  side: 'A' | 'B'
  song: Song
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-w-0 flex-col items-center rounded-xl border p-2.5 transition-colors ${
        active
          ? 'border-lime-400/50 bg-lime-400/[0.08] ring-1 ring-lime-400/30'
          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
      }`}
    >
      <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-lime-400/80">
        Song {side}
      </span>
      {song.coverUrl ? (
        <img
          src={song.coverUrl}
          alt=""
          className="mb-2 aspect-square w-full max-w-[88px] rounded-lg object-cover"
        />
      ) : (
        <div className="mb-2 flex aspect-square w-full max-w-[88px] items-center justify-center rounded-lg bg-neutral-800/80">
          <Music2 className="h-6 w-6 text-neutral-600" />
        </div>
      )}
      <p className="w-full truncate text-center text-sm font-semibold text-neutral-100">{song.title}</p>
      <p className="w-full truncate text-center text-xs text-neutral-500">{song.artist}</p>
    </button>
  )
}

export function MatchMobileDuell({
  songA,
  songB,
  userVoteCount,
  voteDisabled,
  skipInactive,
  skipInactiveSec,
  onVote,
  onSkip,
}: MatchMobileDuellProps) {
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const activeSong = activeSide === 'A' ? songA : songB
  const hasDetails =
    Boolean(activeSong.description) || activeSong.techStackTags.length > 0

  useEffect(() => {
    setActiveSide('A')
    setDetailsOpen(false)
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }, [songA.id, songB.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    audio.load()
  }, [activeSide, activeSong.audioUrl])

  const selectSide = (side: 'A' | 'B') => {
    setActiveSide(side)
    setDetailsOpen(false)
  }

  return (
    <>
      <div className="pb-40">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <DuellSide side="A" song={songA} active={activeSide === 'A'} onSelect={() => selectSide('A')} />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">vs</span>
          <DuellSide side="B" song={songB} active={activeSide === 'B'} onSelect={() => selectSide('B')} />
        </div>

        <div className="mt-4 rounded-xl bg-neutral-800/50 p-3">
          <p className="mb-2 text-center text-xs text-neutral-500">
            Player für Song {activeSide}
          </p>
          <audio
            ref={audioRef}
            key={`${activeSide}-${activeSong.id}`}
            src={getPlayableAudioUrl(activeSong.audioUrl)}
            controls
            controlsList="nodownload"
            preload="metadata"
            className="w-full"
          />
        </div>

        {hasDetails && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-300"
            >
              Mehr Infos
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {detailsOpen && (
              <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-3 text-sm text-neutral-400">
                {activeSong.description && (
                  <p className="leading-relaxed break-words">{activeSong.description}</p>
                )}
                {activeSong.techStackTags.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${activeSong.description ? 'mt-3' : ''}`}>
                    {activeSong.techStackTags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <ReportContentButton song={activeSong} context="match" />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800/80 bg-neutral-950/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <p className="mb-2 text-center text-[11px] text-neutral-500">
          Deine Abstimmungen: <span className="tabular-nums text-neutral-400">{userVoteCount}</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onVote('A')}
            disabled={voteDisabled}
            className="btn-primary !py-3.5 !text-base disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ThumbsUp className="h-5 w-5" />
            Song A
          </button>
          <button
            type="button"
            onClick={() => onVote('B')}
            disabled={voteDisabled}
            className="btn-primary !py-3.5 !text-base disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ThumbsUp className="h-5 w-5" />
            Song B
          </button>
        </div>
        <button
          type="button"
          onClick={onSkip}
          disabled={skipInactive}
          aria-disabled={skipInactive}
          className={
            skipInactive
              ? 'mt-2 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-5 py-3 text-sm font-medium text-neutral-500'
              : 'btn-subtle mt-2 w-full'
          }
        >
          <Shuffle className={`h-4 w-4 shrink-0 ${skipInactive ? 'text-neutral-600' : ''}`} />
          {skipInactive ? `Pause (${skipInactiveSec}s)` : 'Überspringen'}
        </button>
      </div>
    </>
  )
}
