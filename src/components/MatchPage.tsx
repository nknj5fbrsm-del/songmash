import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Info, Shuffle } from 'lucide-react'
import { useSongs } from '../context/SongContext'
import { PairingInfoModal } from './PairingInfoModal'
import { SongCard } from './SongCard'
import { VoteBadge } from './VoteBadge'

function MatchInfoButton({
  className,
  onPairingClick,
}: {
  className?: string
  onPairingClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPairingClick}
      className={`inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-300 ${className ?? ''}`}
    >
      <Info className="h-4 w-4 shrink-0 text-lime-400/80" aria-hidden />
      Wie kommen die Matches zustande?
    </button>
  )
}

function subscribeCooldownTick(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 250)
  return () => window.clearInterval(id)
}

function getCooldownSecondsSnapshot(until: number): number {
  if (until <= 0) return 0
  const remaining = until - Date.now()
  return remaining > 0 ? Math.max(1, Math.ceil(remaining / 1000)) : 0
}

function useCooldownSeconds(until: number): number {
  return useSyncExternalStore(
    subscribeCooldownTick,
    () => getCooldownSecondsSnapshot(until),
    () => 0,
  )
}

function useCooldownActive(until: number): boolean {
  return useCooldownSeconds(until) > 0
}

export function MatchPage() {
  const {
    currentMatch,
    vote,
    userVoteCount,
    skipCooldownUntil,
    voteRateLimitUntil,
    voteRateLimitMessage,
    error,
  } = useSongs()
  const [pairingInfoOpen, setPairingInfoOpen] = useState(false)
  const skipCooldownActive = useCooldownActive(skipCooldownUntil)
  const skipCooldownSec = useCooldownSeconds(skipCooldownUntil)
  const voteRateLimitSec = useCooldownSeconds(voteRateLimitUntil)
  const voteRateLimitActive = voteRateLimitSec > 0
  const skipInactive = skipCooldownActive || voteRateLimitActive
  const skipInactiveSec = skipCooldownActive ? skipCooldownSec : voteRateLimitSec
  const audioRefA = useRef<HTMLAudioElement>(null)
  const audioRefB = useRef<HTMLAudioElement>(null)

  const pauseOther = useCallback((which: 'A' | 'B') => {
    if (which === 'A') audioRefB.current?.pause()
    else audioRefA.current?.pause()
  }, [])

  const resetPlayers = useCallback(() => {
    for (const audio of [audioRefA.current, audioRefB.current]) {
      if (!audio) continue
      audio.pause()
      audio.currentTime = 0
    }
  }, [])

  useEffect(() => {
    if (!currentMatch) return
    resetPlayers()
  }, [currentMatch?.songA.id, currentMatch?.songB.id, resetPlayers])

  if (!currentMatch) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg text-neutral-400">
            Mindestens zwei Songs nötig für ein Match.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Reiche einen Song ein, um loszulegen.
          </p>
          <div className="mt-6 flex justify-center">
            <MatchInfoButton onPairingClick={() => setPairingInfoOpen(true)} />
          </div>
        </div>
        <PairingInfoModal open={pairingInfoOpen} onClose={() => setPairingInfoOpen(false)} />
      </>
    )
  }

  const { songA, songB } = currentMatch

  return (
    <div>
      <header className="mb-6 text-center">
        <h1 className="page-title">Wer gewinnt?</h1>
        <p className="page-subtitle">
          Höre beide Tracks und vote für deinen Favoriten.
        </p>
        <div className="mt-2 flex justify-center">
          <MatchInfoButton onPairingClick={() => setPairingInfoOpen(true)} />
        </div>
      </header>

      <PairingInfoModal open={pairingInfoOpen} onClose={() => setPairingInfoOpen(false)} />

      {voteRateLimitActive && (
        <p className="alert-error mx-auto mb-4 max-w-lg text-center text-sm" role="alert">
          {voteRateLimitMessage ?? 'Zu viele Votes in kurzer Zeit. Kurz warten.'}
          <span className="mt-1 block font-mono tabular-nums text-red-200/90">
            Noch {voteRateLimitSec}s
          </span>
        </p>
      )}

      {error && !voteRateLimitActive && (
        <p className="alert-error mx-auto mb-4 max-w-lg text-center text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-stretch">
        <SongCard
          key={songA.id}
          song={songA}
          side="A"
          audioRef={audioRefA}
          onPlay={() => pauseOther('A')}
          onVote={() => vote('A')}
          voteDisabled={voteRateLimitActive}
        />

        <div className="flex w-full flex-col items-center justify-center gap-4 py-2 lg:w-44 lg:shrink-0 lg:self-center">
          <VoteBadge count={userVoteCount} />
          <button
            type="button"
            onClick={() => vote('skip')}
            disabled={skipInactive}
            aria-disabled={skipInactive}
            className={
              skipInactive
                ? 'flex w-full max-w-xs cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-5 py-3 text-sm font-medium text-neutral-500 lg:max-w-none'
                : 'btn-subtle w-full max-w-xs lg:max-w-none'
            }
            title={
              skipInactive
                ? `Kurz warten (${skipInactiveSec}s)`
                : 'Überspringen ohne Elo-Änderung'
            }
          >
            <Shuffle className={`h-4 w-4 shrink-0 ${skipInactive ? 'text-neutral-600' : ''}`} />
            {skipInactive ? `Pause (${skipInactiveSec}s)` : 'Skip / Unentschieden'}
          </button>
        </div>

        <SongCard
          key={songB.id}
          song={songB}
          side="B"
          audioRef={audioRefB}
          onPlay={() => pauseOther('B')}
          onVote={() => vote('B')}
          voteDisabled={voteRateLimitActive}
        />
      </div>
    </div>
  )
}
