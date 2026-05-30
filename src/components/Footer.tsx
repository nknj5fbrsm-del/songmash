import { Shield } from 'lucide-react'

interface FooterProps {
  showModeration?: boolean
  onModeration?: () => void
}

export function Footer({ showModeration, onModeration }: FooterProps) {
  return (
    <footer className="mt-auto border-t border-neutral-800/60 py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-neutral-600">
        <p>SongMash · Community-Voting für KI-Musik</p>
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
