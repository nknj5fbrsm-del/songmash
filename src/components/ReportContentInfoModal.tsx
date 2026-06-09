import { useEffect, useId, useRef } from 'react'
import { Flag, X } from 'lucide-react'
import { legal } from '../config/legal'

interface ReportContentInfoModalProps {
  open: boolean
  onClose: () => void
}

export function ReportContentInfoModal({ open, onClose }: ReportContentInfoModalProps) {
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
        className="card relative z-10 max-h-[min(90vh,560px)] w-full max-w-lg overflow-y-auto shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flag className="h-6 w-6 shrink-0 text-lime-400" aria-hidden />
            <h2 id={titleId} className="text-xl font-bold text-neutral-50">
              Regelverstoß melden
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
            Verstöße gegen unsere{' '}
            <strong className="text-neutral-100">Einreichungsregeln</strong> (z.&nbsp;B.
            jugendgefährdende, pornografische, hassverbreitende oder urheberrechtlich problematische
            Inhalte) kannst du direkt beim betroffenen Song melden:
          </p>
          <ul className="list-inside list-disc space-y-1 text-neutral-400">
            <li>
              <strong className="font-medium text-neutral-300">Voting:</strong> unter dem
              Audio-Player bei Song A oder B
            </li>
            <li>
              <strong className="font-medium text-neutral-300">Leaderboard:</strong> Song anhören
              (Kopfhörer-Icon) → „Inhalt melden“ unter dem Player
            </li>
          </ul>
          <p className="text-neutral-400">
            Pro Song ist <strong className="text-neutral-300">eine Meldung</strong> möglich. Es
            öffnet sich dein E-Mail-Programm mit einer vorausgefüllten Nachricht an uns.
          </p>
          <p className="text-neutral-500">
            Alternativ erreichst du uns unter{' '}
            <a href={`mailto:${legal.email}`} className="text-lime-400/90 hover:text-lime-300">
              {legal.email}
            </a>
            .
          </p>
        </div>

        <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
          Verstanden
        </button>
      </div>
    </div>
  )
}
