import { Heart, Music2, Trophy, Upload } from 'lucide-react'
import { getPaypalDonateUrl } from '../config/legal'

export type Page =
  | 'match'
  | 'leaderboard'
  | 'submit'
  | 'moderation'
  | 'impressum'
  | 'datenschutz'
  | 'remove-song'

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
  const donateUrl = getPaypalDonateUrl()

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
          {donateUrl && (
            <div className="mb-1.5 grid grid-cols-3 gap-2 px-1.5">
              <div aria-hidden />
              <div className="flex justify-center">
                <a
                  href={donateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-neutral-200"
                >
                  <Heart
                    className="h-3.5 w-3.5 fill-red-500 text-red-500"
                    aria-hidden
                  />
                  Spende
                </a>
              </div>
              <div aria-hidden />
            </div>
          )}

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
