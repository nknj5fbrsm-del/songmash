import { ExternalLink, Heart } from 'lucide-react'
import { getPaypalDonateUrl } from '../config/legal'

const externalLinks = [
  { label: 'NilsP', href: 'https://suno.com/@cwzjtpwwwy' },
  { label: 'Suno Mastermind', href: 'https://suno-mastermind-v2.vercel.app' },
] as const

const pillClassName =
  'inline-flex items-center gap-1.5 rounded-xl border border-lime-400/20 bg-lime-400/[0.06] px-2.5 py-1.5 text-xs font-medium text-lime-300/90 transition-colors hover:border-lime-400/35 hover:bg-lime-400/10 hover:text-lime-200'

export function HeaderPillBar({ className }: { className?: string }) {
  const donateUrl = getPaypalDonateUrl()

  return (
    <nav
      aria-label="Links und Spende"
      className={`inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-neutral-900/60 p-1.5 ${className ?? ''}`}
    >
      {externalLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={pillClassName}
        >
          <span className="truncate">{link.label}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-lime-400" aria-hidden />
        </a>
      ))}
      {donateUrl && (
        <a
          href={donateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={pillClassName}
        >
          <Heart className="h-3.5 w-3.5 shrink-0 fill-red-500 text-red-500" aria-hidden />
          <span>Spende</span>
        </a>
      )}
    </nav>
  )
}

export const headerPillClassName = pillClassName
