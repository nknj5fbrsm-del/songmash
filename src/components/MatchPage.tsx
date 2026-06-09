import { useCallback, useEffect, useRef, useState } from 'react'
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

export function MatchPage() {
  const { currentMatch, vote, userVoteCount } = useSongs()
  const [pairingInfoOpen, setPairingInfoOpen] = useState(false)
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

      <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-stretch">
        <SongCard
          key={songA.id}
          song={songA}
          side="A"
          audioRef={audioRefA}
          onPlay={() => pauseOther('A')}
          onVote={() => vote('A')}
        />

        <div className="flex w-full flex-col items-center justify-center gap-4 py-2 lg:w-44 lg:shrink-0 lg:self-center">
          <VoteBadge count={userVoteCount} />
          <button
            type="button"
            onClick={() => vote('skip')}
            className="btn-subtle w-full max-w-xs lg:max-w-none"
          >
            <Shuffle className="h-4 w-4" />
            Skip / Unentschieden
          </button>
        </div>

        <SongCard
          key={songB.id}
          song={songB}
          side="B"
          audioRef={audioRefB}
          onPlay={() => pauseOther('B')}
          onVote={() => vote('B')}
        />
      </div>
    </div>
  )
}
