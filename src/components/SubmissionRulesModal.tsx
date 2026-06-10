import { useEffect, useId, useRef, useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'

interface SubmissionRulesModalProps {
  open: boolean
  onAccept: () => void
  onCancel?: () => void
}

export function SubmissionRulesModal({ open, onAccept, onCancel }: SubmissionRulesModalProps) {
  const titleId = useId()
  const checkboxId = useId()
  const continueRef = useRef<HTMLButtonElement>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!open) {
      setChecked(false)
      return
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow || ''
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card relative z-10 max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto shadow-2xl shadow-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 shrink-0 text-lime-400" aria-hidden />
            <h2 id={titleId} className="text-xl font-bold text-neutral-50">
              Einreichungsregeln
            </h2>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary shrink-0 px-3 py-2"
              aria-label="Abbrechen"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-neutral-300">
          <div className="rounded-xl border border-lime-400/20 bg-lime-400/[0.06] px-4 py-3 text-neutral-300">
            <p className="font-medium text-neutral-100">Maximal fünf Songs pro Person</p>
            <p className="mt-1.5 text-neutral-400">
              Damit das Leaderboard fair und übersichtlich bleibt, solltest du höchstens{' '}
              <strong className="font-medium text-neutral-300">fünf Songs</strong> gleichzeitig
              einreichen. Wenn du mehr hochlädst, kann die Moderation überzählige Beiträge
              entfernen — in der Regel beginnend bei den Songs mit dem{' '}
              <strong className="font-medium text-neutral-300">niedrigsten Elo-Wert</strong>.
            </p>
          </div>

          <p>
            Bevor du einen Song oder ein Cover hochlädst, bestätige bitte, dass deine Inhalte
            unseren Regeln entsprechen. Du bist für alles verantwortlich, was du einreichst.
          </p>

          <section>
            <h3 className="mb-2 font-semibold text-neutral-100">
              Nicht erlaubt — Audio, Texte &amp; Cover
            </h3>
            <ul className="list-inside list-disc space-y-1 text-neutral-400">
              <li>Jugendgefährdende Inhalte</li>
              <li>Pornografische oder sexuell explizite Inhalte</li>
              <li>Gewaltverherrlichende, grauenhafte oder extrem brutale Darstellungen</li>
              <li>
                Hassrede, Volksverhetzung, Diskriminierung (z.&nbsp;B. rassistisch, antisemitisch,
                sexistisch, homo- oder transfeindlich)
              </li>
              <li>Extremistische oder terroristische Propaganda</li>
              <li>Beleidigungen, Mobbing, Drohungen gegen Personen oder Gruppen</li>
              <li>Politische Wahlwerbung oder Parteipropaganda</li>
              <li>Illegale Inhalte (z.&nbsp;B. Aufrufe zu Straftaten)</li>
              <li>Urheberrechtsverletzungen (fremde Werke ohne Berechtigung)</li>
              <li>
                Verletzungen von Persönlichkeitsrechten (z.&nbsp;B. Abbildungen oder Stimmen ohne
                Einwilligung)
              </li>
              <li>Irreführende oder täuschende Angaben (Titel, Artist, Cover)</li>
              <li>Spam, Werbung oder rein kommerzielle Einreichungen ohne Musikbezug</li>
            </ul>
          </section>

          <p className="text-neutral-400">
            <strong className="font-medium text-neutral-300">Cover-Bilder</strong> unterliegen denselben
            Regeln: keine NSFW-, Gewalt-, Hass- oder urheberrechtlich problematischen Motive.
          </p>

          <p className="text-neutral-500">
            Wir können Inhalte prüfen, sperren oder löschen, wenn sie gegen diese Regeln verstoßen.
            Bei schweren Verstößen behalten wir uns vor, Inhalte zu dokumentieren und behördlich zu
            melden.
          </p>
        </div>

        <label
          htmlFor={checkboxId}
          className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-700 bg-neutral-800/40 p-4"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-600 bg-neutral-900 text-lime-400 focus:ring-lime-400/30"
          />
          <span className="text-sm leading-relaxed text-neutral-300">
            Ich habe die Einreichungsregeln gelesen und bestätige, dass mein Song, mein Cover und
            meine Angaben diesen Regeln entsprechen. Ich bin berechtigt, die Inhalte zu
            veröffentlichen.
          </span>
        </label>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Abbrechen
            </button>
          )}
          <button
            ref={continueRef}
            type="button"
            disabled={!checked}
            onClick={onAccept}
            className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Weiter zum Einreichen
          </button>
        </div>
      </div>
    </div>
  )
}
