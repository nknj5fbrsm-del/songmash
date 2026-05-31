import { Music2, Trophy, Upload } from 'lucide-react'

export type Page = 'match' | 'leaderboard' | 'submit' | 'moderation' | 'impressum' | 'datenschutz'

interface NavigationProps {
  current: Page
  onNavigate: (page: Page) => void
}

const links: { id: Page; label: string; icon: typeof Music2 }[] = [
  { id: 'match', label: 'Voting', icon: Music2 },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'submit', label: 'Song einreichen', icon: Upload },
]

export function Navigation({ current, onNavigate }: NavigationProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 pt-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/10">
            <Music2 className="h-5 w-5 text-lime-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-neutral-50">
              Song<span className="text-lime-400">Mash</span>
            </span>
            <span className="text-xs text-neutral-500 sm:text-sm">
              by{' '}
              <a
                href="https://suno.com/@cwzjtpwwwy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-lime-400/80 transition-colors hover:text-lime-300"
              >
                NilsP
              </a>
            </span>
          </div>
        </div>

        <nav className="mt-5 pb-3">
          <div className="flex gap-2 rounded-2xl bg-neutral-900/60 p-1.5">
            {links.map(({ id, label, icon: Icon }) => {
              const active = current === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={active ? 'nav-tab nav-tab-active' : 'nav-tab'}
                >
                  <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </header>
  )
}
