import { Shield } from 'lucide-react'

interface FooterProps {
  showModeration?: boolean
  onModeration?: () => void
  onImpressum?: () => void
  onDatenschutz?: () => void
  onRemoveSong?: () => void
  onReportInfo?: () => void
}

export function Footer({
  showModeration,
  onModeration,
  onImpressum,
  onDatenschutz,
  onRemoveSong,
  onReportInfo,
}: FooterProps) {
  return (
    <footer className="mt-auto border-t border-neutral-800/60 py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-neutral-600">
        <p>SongMash · Community-Voting für KI-Musik</p>
        {(onImpressum || onDatenschutz || onRemoveSong || onReportInfo) && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {onImpressum && (
              <button
                type="button"
                onClick={onImpressum}
                className="text-neutral-600 transition-colors hover:text-neutral-400"
              >
                Impressum
              </button>
            )}
            {onImpressum && (onDatenschutz || onRemoveSong || onReportInfo) && (
              <span aria-hidden="true">·</span>
            )}
            {onDatenschutz && (
              <button
                type="button"
                onClick={onDatenschutz}
                className="text-neutral-600 transition-colors hover:text-neutral-400"
              >
                Datenschutz
              </button>
            )}
            {onDatenschutz && (onRemoveSong || onReportInfo) && <span aria-hidden="true">·</span>}
            {onRemoveSong && (
              <button
                type="button"
                onClick={onRemoveSong}
                className="text-neutral-600 transition-colors hover:text-neutral-400"
              >
                Song entfernen
              </button>
            )}
            {onRemoveSong && onReportInfo && <span aria-hidden="true">·</span>}
            {onReportInfo && (
              <button
                type="button"
                onClick={onReportInfo}
                className="text-neutral-600 transition-colors hover:text-neutral-400"
              >
                Regelverstoß melden
              </button>
            )}
          </div>
        )}
        {showModeration && onModeration && (
          <button
            type="button"
            onClick={onModeration}
            className="inline-flex items-center gap-1.5 text-neutral-600 transition-colors hover:text-neutral-400"
          >
            <Shield className="h-3 w-3" />
            Moderation
          </button>
        )}
      </div>
    </footer>
  )
}
