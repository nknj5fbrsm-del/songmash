import { useEffect, useId, useRef } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { legal } from '../config/legal'
import { buildForumPasswordRequestMailto } from '../lib/buildForumPasswordRequestMailto'

interface ForumAnnouncementModalProps {
  open: boolean
  onClose: () => void
  onOpenForum: () => void
}

export function ForumAnnouncementModal({
  open,
  onClose,
  onOpenForum,
}: ForumAnnouncementModalProps) {
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
            <MessageCircle className="h-6 w-6 shrink-0 text-lime-400" aria-hidden />
            <h2 id={titleId} className="text-xl font-bold text-neutral-50">
              Neu: Community-Forum
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
            SongMash hat jetzt ein <strong className="text-neutral-100">Community-Forum</strong>{' '}
            mit Diskussionen und einem gemeinsamen <strong className="text-neutral-100">Lounge-Chat</strong>.
            Du findest es im Footer unter „Forum“.
          </p>
          <p>
            Der Zugang ist passwortgeschützt. Wenn du mindestens einen Song eingereicht hast, kannst
            du das Passwort per E-Mail anfragen:
          </p>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
            <p className="mb-1 text-xs uppercase tracking-wider text-neutral-500">Kontakt</p>
            <a
              href={`mailto:${legal.email}`}
              className="break-all text-base font-medium text-lime-400/90 hover:text-lime-300"
            >
              {legal.email}
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <a href={buildForumPasswordRequestMailto()} className="btn-secondary flex-1 text-center">
            Passwort per E-Mail anfragen
          </a>
          <button
            type="button"
            onClick={() => {
              onOpenForum()
              onClose()
            }}
            className="btn-primary flex-1"
          >
            Zum Forum
          </button>
        </div>
        <button type="button" onClick={onClose} className="btn-secondary mt-2 w-full">
          Verstanden
        </button>
      </div>
    </div>
  )
}
