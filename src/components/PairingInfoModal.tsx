import { useEffect, useId, useRef } from 'react'
import { GitCompare, X } from 'lucide-react'
import { PAIR_BAN_ROUNDS } from '../lib/match'
import { PROVISIONAL_VOTE_THRESHOLD } from '../lib/provisionalFairness'

interface PairingInfoModalProps {
  open: boolean
  onClose: () => void
}

export function PairingInfoModal({ open, onClose }: PairingInfoModalProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    closeRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card relative z-10 max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <GitCompare className="h-6 w-6 shrink-0 text-lime-400" aria-hidden />
            <h2 id={titleId} className="text-xl font-bold text-neutral-50">
              Match-Auswahl
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn-secondary shrink-0 px-3 py-2"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-neutral-300">
          <p>
            SongMash stellt dir immer <strong className="text-neutral-100">zwei Songs</strong> gegenüber.
            Welche zwei das sind, hängt nicht vom Elo ab, sondern von Zufall und ein paar fairen Regeln
            in deiner aktuellen Browser-Session.
          </p>

          <section>
            <h3 className="mb-2 font-semibold text-neutral-100">So entsteht ein Match</h3>
            <ul className="list-inside list-disc space-y-1 text-neutral-400">
              <li>Aus allen eingereichten Songs werden alle möglichen Paare gebildet</li>
              <li>Ein Paar wird zufällig gewählt — Song A und B können dabei getauscht sein</li>
              <li>Nach jedem Vote oder Skip kommt automatisch das nächste Match</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-semibold text-neutral-100">Damit es nicht monoton wird</h3>
            <ul className="list-inside list-disc space-y-1 text-neutral-400">
              <li>
                Die <strong className="font-medium text-neutral-300">beiden Songs</strong> vom gerade
                beendeten Match erscheinen im <strong className="font-medium text-neutral-300">direkt
                nächsten</strong> Match nicht (wenn genug andere Songs da sind)
              </li>
              <li>
                Dasselbe Paar (gleiche zwei Songs) ist für die nächsten{' '}
                <strong className="font-medium text-neutral-300">{PAIR_BAN_ROUNDS} Matches</strong>{' '}
                gesperrt
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-semibold text-neutral-100">Chancen für neue Songs</h3>
            <p className="text-neutral-400">
              Songs mit weniger als{' '}
              <strong className="font-medium text-neutral-300">
                {PROVISIONAL_VOTE_THRESHOLD} Match-Teilnahmen
              </strong>{' '}
              werden bei der Zufallsauswahl etwas häufiger gezogen, bis genug Vergleiche
              vorliegen.
            </p>
          </section>

          <p className="text-neutral-500">
            Gibt es sehr wenige Songs, werden die Regeln schrittweise gelockert, damit du weiter
            abstimmen kannst. Bei nur zwei Songs gibt es ohnehin nur ein einziges Paar.
          </p>
        </div>

        <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
          Verstanden
        </button>
      </div>
    </div>
  )
}
