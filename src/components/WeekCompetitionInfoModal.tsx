import { useEffect, useId, useRef } from 'react'
import { Crown, TrendingUp, X } from 'lucide-react'
import { MIN_WEEK_VOTES_FOR_MVP } from '../lib/competitionWeek'

interface WeekCompetitionInfoModalProps {
  open: boolean
  onClose: () => void
}

export function WeekCompetitionInfoModal({ open, onClose }: WeekCompetitionInfoModalProps) {
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
            <Crown className="h-6 w-6 shrink-0 text-lime-400" aria-hidden />
            <h2 id={titleId} className="text-xl font-bold text-neutral-50">
              Song der Woche
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

        <p className="mb-4 text-sm leading-relaxed text-neutral-400">
          Jede <strong className="text-neutral-200">Kalenderwoche</strong> (Montag 00:00 bis Sonntag
          23:59, Europe/Berlin). Am Ende werden zwei Songs gekürt.
        </p>

        <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-neutral-800 sm:grid-cols-[1fr_auto_1fr]">
          <section className="p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-100">
              <Crown className="h-4 w-4 text-lime-400" aria-hidden />
              Song der Woche
            </h3>
            <p className="text-sm leading-relaxed text-neutral-400">
              Wer am <strong className="text-neutral-300">Sonntagabend</strong> auf Platz 1 des
              Leaderboards steht (höchstes Elo), gewinnt die Krone.
            </p>
          </section>

          <div
            className="hidden w-px shrink-0 bg-neutral-800 sm:block"
            aria-hidden
          />

          <div className="h-px shrink-0 bg-neutral-800 sm:hidden" aria-hidden />

          <section className="p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-100">
              <TrendingUp className="h-4 w-4 text-lime-400" aria-hidden />
              Aufsteiger der Woche
            </h3>
            <p className="text-sm leading-relaxed text-neutral-400">
              Der Song mit dem größten <strong className="text-neutral-300">Rang-Sprung</strong>{' '}
              im Leaderboard seit Montag — mindestens {MIN_WEEK_VOTES_FOR_MVP} Votes in dieser Woche
              nötig.
            </p>
          </section>
        </div>

        <p className="mt-4 text-sm text-neutral-500">
          Der Countdown zeigt, wie lange die Woche noch läuft. Bis zur letzten Sekunde kann sich Platz
          1 noch ändern.
        </p>

        <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
          Verstanden
        </button>
      </div>
    </div>
  )
}
