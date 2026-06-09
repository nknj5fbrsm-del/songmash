import { useEffect, useId, useRef } from 'react'
import { Info, X } from 'lucide-react'
import { calculateElo, ELO_K_FACTOR } from '../lib/elo'
import {
  ELO_K_FACTOR_PROVISIONAL,
  PROVISIONAL_VOTE_THRESHOLD,
} from '../lib/provisionalFairness'
import { DEFAULT_ELO } from '../lib/recalculateElo'

const example = calculateElo(1600, 1400, 'A')

interface EloInfoModalProps {
  open: boolean
  onClose: () => void
}

export function EloInfoModal({ open, onClose }: EloInfoModalProps) {
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
            <Info className="h-6 w-6 shrink-0 text-lime-400" aria-hidden />
            <h2 id={titleId} className="text-xl font-bold text-neutral-50">
              Elo &amp; Score
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
            Jedes Lied startet mit <strong className="text-neutral-100">{DEFAULT_ELO} Elo</strong>.
            Wenn du für Song A oder B votest, steigen die Punkte des Gewinners und sinken die des
            Verlierers — abhängig davon, wie „überraschend“ das Ergebnis war.
          </p>

          <section>
            <h3 className="mb-2 font-semibold text-neutral-100">Grundidee</h3>
            <ul className="list-inside list-disc space-y-1 text-neutral-400">
              <li>Stärkerer Gegner schlagen → mehr Pluspunkte</li>
              <li>Verlieren gegen einen Schwächeren → größerer Abzug</li>
              <li>
                <strong className="font-medium text-neutral-300">Skip / Unentschieden</strong>{' '}
                zählt als Abstimmungsrunde, ändert aber keine Elo-Werte
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-semibold text-neutral-100">Berechnung (vereinfacht)</h3>
            <p className="text-neutral-400">
              Zuerst wird die erwartete Siegchance aus dem Elo-Unterschied berechnet (Schach-Formel
              mit Skala 400). Danach:
            </p>
            <p className="mt-2 rounded-lg bg-neutral-950/60 px-3 py-2 font-mono text-xs text-lime-300/90">
              Neues Elo = Altes Elo + K × (Ergebnis − Erwartung)
            </p>
            <p className="mt-2 text-neutral-500">
              Ergebnis = 1 für den Gewinner, 0 für den Verlierer. K ist pro Song {ELO_K_FACTOR} oder{' '}
              {ELO_K_FACTOR_PROVISIONAL} (siehe unten). Werte werden gerundet.
            </p>
            <p className="mt-2 text-neutral-500">
              Songs mit weniger als {PROVISIONAL_VOTE_THRESHOLD} Match-Teilnahmen nutzen
              vorübergehend einen höheren Faktor ({ELO_K_FACTOR_PROVISIONAL} statt {ELO_K_FACTOR}),
              damit sich neue Einreichungen schneller einpendeln.
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-semibold text-neutral-100">Score im Leaderboard</h3>
            <p className="text-neutral-400">
              Der <strong className="text-neutral-200">Prozent-Score</strong> zeigt, wie oft ein
              Song in direkten Duellen gewinnt — nur wenn du für A oder B votest, nicht bei Skip.
            </p>
            <p className="mt-2 text-neutral-500">
              Formel mit Puffer für neue Songs: (Siege + 5) ÷ (Siege + Niederlagen + 10). Ohne
              echte Duelle startet der Wert bei etwa 50% und wird stabiler, je mehr Matches
              entschieden wurden.
            </p>
            <p className="mt-2 text-neutral-500">
              <strong className="font-medium text-neutral-300">Votes</strong> zählen alle
              Match-Teilnahmen inkl. Skip. Der Score nutzt nur Siege und Niederlagen. Die
              Platzierung sortiert weiterhin nur nach Elo.
            </p>
          </section>

          <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
            <h3 className="mb-2 text-sm font-semibold text-neutral-100">Beispiel</h3>
            <p className="text-neutral-400">
              Song A ({1600}) vs. Song B ({1400}) — du votest für{' '}
              <strong className="text-neutral-200">A</strong>:
            </p>
            <p className="mt-2 font-mono text-xs text-neutral-300">
              A: {1600} → {example.newRatingA} · B: {1400} → {example.newRatingB}
            </p>
          </section>

          <p className="text-neutral-500">
            Das Leaderboard sortiert alle Songs nach ihrem aktuellen Elo. Viele Votes über
            längere Zeit machen die Rangliste aussagekräftiger.
          </p>
        </div>

        <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
          Verstanden
        </button>
      </div>
    </div>
  )
}
