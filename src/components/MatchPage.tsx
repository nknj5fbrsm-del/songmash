import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { GitCompare, Shuffle } from 'lucide-react'
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
    <div className={`flex justify-center ${className ?? ''}`}>
      <button type="button" onClick={onPairingClick} className="btn-subtle">
        <GitCompare className="h-4 w-4" />
        Match Auswahl
      </button>
    </div>
  )
}

function subscribeCooldownTick(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 250)
  return () => window.clearInterval(id)
}

function useCooldownActive(until: number): boolean {
  return useSyncExternalStore(
    subscribeCooldownTick,
    () => Date.now() < until,
    () => false,
  )
}

export function MatchPage() {
  const { currentMatch, vote, userVoteCount, voteCooldownUntil, error } = useSongs()
  const [pairingInfoOpen, setPairingInfoOpen] = useState(false)
  const voteCooldownActive = useCooldownActive(voteCooldownUntil)
  const cooldownSec = voteCooldownActive
    ? Math.max(1, Math.ceil((voteCooldownUntil - Date.now()) / 1000))
    : 0
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
          <MatchInfoButton
            className="mt-6"
            onPairingClick={() => setPairingInfoOpen(true)}
          />
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
        <MatchInfoButton
          className="mt-4"
          onPairingClick={() => setPairingInfoOpen(true)}
        />
      </header>

      <PairingInfoModal open={pairingInfoOpen} onClose={() => setPairingInfoOpen(false)} />

      {error && (
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
          voteDisabled={voteCooldownActive}
        />

        <div className="flex w-full flex-col items-center justify-center gap-4 py-2 lg:w-44 lg:shrink-0 lg:self-center">
          <VoteBadge count={userVoteCount} />
          <button
            type="button"
            onClick={() => vote('skip')}
            disabled={voteCooldownActive}
            className="btn-subtle w-full max-w-xs disabled:cursor-not-allowed disabled:opacity-50 lg:max-w-none"
            title={
              voteCooldownActive
                ? `Kurz warten (${cooldownSec}s)`
                : 'Überspringen ohne Elo-Änderung'
            }
          >
            <Shuffle className="h-4 w-4" />
            {voteCooldownActive ? `Pause (${cooldownSec}s)` : 'Skip / Unentschieden'}
          </button>
        </div>

        <SongCard
          key={songB.id}
          song={songB}
          side="B"
          audioRef={audioRefB}
          onPlay={() => pauseOther('B')}
          onVote={() => vote('B')}
          voteDisabled={voteCooldownActive}
        />
      </div>
    </div>
  )
}
