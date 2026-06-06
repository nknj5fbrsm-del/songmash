import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Crown, X } from 'lucide-react'
import type { HallOfFameWeek } from '../types/weekCompetition'
import { HallOfFameList } from './HallOfFame'

interface HallOfFameModalProps {
  open: boolean
  onClose: () => void
  weeks: HallOfFameWeek[]
}

export function HallOfFameModal({ open, onClose, weeks }: HallOfFameModalProps) {
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

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card relative z-10 my-auto max-h-[min(90vh,820px)] w-full max-w-2xl overflow-y-auto shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 shrink-0 text-lime-400" aria-hidden />
            <h2 id={titleId} className="text-xl font-bold text-neutral-50">
              Hall of Fame
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

        <p className="mb-5 text-sm leading-relaxed text-neutral-400">
          Die gekürten Songs vergangener Wochen — verdient gefeiert.
        </p>

        <HallOfFameList weeks={weeks} />

        <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
          Schließen
        </button>
      </div>
    </div>,
    document.body,
  )
}
