import { Shield } from 'lucide-react'

interface FooterProps {
  showModeration?: boolean
  padForMobileVoteDock?: boolean
  onModeration?: () => void
  onForum?: () => void
  onImpressum?: () => void
  onDatenschutz?: () => void
  onRemoveSong?: () => void
  onReportInfo?: () => void
}

export function Footer({
  showModeration,
  padForMobileVoteDock,
  onModeration,
  onForum,
  onImpressum,
  onDatenschutz,
  onRemoveSong,
  onReportInfo,
}: FooterProps) {
  const links = [
    onImpressum && { label: 'Impressum', onClick: onImpressum },
    onDatenschutz && { label: 'Datenschutz', onClick: onDatenschutz },
    onRemoveSong && { label: 'Song entfernen', onClick: onRemoveSong },
    onReportInfo && { label: 'Regelverstoß melden', onClick: onReportInfo },
    onForum && { label: 'Forum', onClick: onForum },
  ].filter(Boolean) as { label: string; onClick: () => void }[]

  return (
    <footer
      className={`mt-auto border-t border-neutral-800/60 py-6 ${
        padForMobileVoteDock ? 'footer-mobile-vote-dock' : ''
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-neutral-600">
        <p>SongMash · Community-Voting für KI-Musik</p>
        {links.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {links.map((link, index) => (
              <span key={link.label} className="contents">
                {index > 0 && <span aria-hidden="true">·</span>}
                <button
                  type="button"
                  onClick={link.onClick}
                  className="text-neutral-600 transition-colors hover:text-neutral-400"
                >
                  {link.label}
                </button>
              </span>
            ))}
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
