import { Music2, Trophy, Upload } from 'lucide-react'
import { isTurnstileEnabled } from '../lib/turnstileConfig'
import { preloadTurnstileScript } from '../lib/turnstileLoader'
import { HeaderPillBar } from './HeaderPillBar'

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
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 pt-5">
        <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
          <div className="flex justify-center sm:justify-start">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400/10">
                <Music2 className="h-5 w-5 text-lime-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tracking-tight text-neutral-50">
                  Song<span className="text-lime-400">Mash</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">
                  Beta
                </span>
              </div>
            </div>
          </div>

          <HeaderPillBar className="justify-self-center" />

          <div className="hidden sm:block" aria-hidden />
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
                  onMouseEnter={
                    id === 'submit' && isTurnstileEnabled()
                      ? () => {
                          preloadTurnstileScript().catch(() => {})
                        }
                      : undefined
                  }
                  onFocus={
                    id === 'submit' && isTurnstileEnabled()
                      ? () => {
                          preloadTurnstileScript().catch(() => {})
                        }
                      : undefined
                  }
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
