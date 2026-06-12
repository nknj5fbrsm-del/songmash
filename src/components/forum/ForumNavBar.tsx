import { ArrowLeft, LayoutGrid } from 'lucide-react'

interface ForumNavBarProps {
  backLabel: string
  onBack: () => void
  onHome: () => void
  showHomeLink?: boolean
}

const linkClass =
  'inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-300'

export function ForumNavBar({ backLabel, onBack, onHome, showHomeLink = true }: ForumNavBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <button type="button" onClick={onBack} className={linkClass}>
        <ArrowLeft className="h-4 w-4 shrink-0" />
        {backLabel}
      </button>
      {showHomeLink && (
        <button type="button" onClick={onHome} className={linkClass}>
          <LayoutGrid className="h-4 w-4 shrink-0" />
          Forum-Übersicht
        </button>
      )}
    </div>
  )
}
