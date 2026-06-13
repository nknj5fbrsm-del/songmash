import { ArrowLeft, LayoutGrid } from 'lucide-react'

interface ForumStickyNavProps {
  backLabel: string
  onBack: () => void
  onHome: () => void
  backDisabled?: boolean
  homeDisabled?: boolean
}

const iconButtonClass =
  'rounded-xl p-3 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-neutral-400'

export function ForumStickyNav({
  backLabel,
  onBack,
  onHome,
  backDisabled = false,
  homeDisabled = false,
}: ForumStickyNavProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <nav
        className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-neutral-800/80 bg-neutral-950/95 p-1.5 shadow-lg backdrop-blur-md"
        aria-label="Forum-Navigation"
      >
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          className={iconButtonClass}
          aria-label={backLabel}
          title={backDisabled ? undefined : backLabel}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onHome}
          disabled={homeDisabled}
          className={iconButtonClass}
          aria-label="Forum-Übersicht"
          title={homeDisabled ? undefined : 'Forum-Übersicht'}
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
      </nav>
    </div>
  )
}
