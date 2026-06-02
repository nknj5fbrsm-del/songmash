import { useMemo } from 'react'
import swordsSvgRaw from '../assets/crossed-swords.svg?raw'

const SLEEPING_FILL = '#d4d4d8'
const VIEW_BOX = '90 38 662 519'

function extractSwordPaths(raw: string): string {
  const match = raw.match(
    /<g id="&lt;Clip Group&gt;" clip-path="url\(#cp1\)">([\s\S]*?)<\/g>\s*<\/g>\s*<\/g>\s*<\/svg>/,
  )
  if (!match?.[1]) {
    throw new Error('crossed-swords.svg: Clip-Gruppe nicht gefunden')
  }

  return match[1]
    .replace(/class="s0"/g, '')
    .replace(/\sid="[^"]*"/g, '')
}

const pathsCache = extractSwordPaths(swordsSvgRaw)

function buildSvgMarkup(paths: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX}" width="100%" height="100%" aria-hidden="true"><g fill="${SLEEPING_FILL}">${paths}</g></svg>`
}

interface BadgeSleepingIconProps {
  className?: string
}

/** Schlafendes Icon (Screenshot 1) — nur unter 50 Votes, ohne Glow. */
export function BadgeSleepingIcon({ className = 'h-11 w-11' }: BadgeSleepingIconProps) {
  const markup = useMemo(() => buildSvgMarkup(pathsCache), [])

  return (
    <div
      className={`inline-flex shrink-0 opacity-90 ${className}`}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
