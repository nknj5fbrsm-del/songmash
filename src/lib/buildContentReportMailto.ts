import { legal } from '../config/legal'
import type { Song } from '../types/song'

export const CONTENT_REPORT_REASONS = [
  { id: 'youth', label: 'Jugendgefährdend' },
  { id: 'porn', label: 'Pornografisch / sexuell explizit' },
  { id: 'violence', label: 'Gewalt / Hassrede / Diskriminierung' },
  { id: 'copyright', label: 'Urheberrecht' },
  { id: 'personality', label: 'Persönlichkeitsrechte' },
  { id: 'misleading', label: 'Irreführung / Spam' },
  { id: 'other', label: 'Sonstiges' },
] as const

export type ContentReportReasonId = (typeof CONTENT_REPORT_REASONS)[number]['id']
export type ContentReportContext = 'leaderboard' | 'match'

export function getContentReportReasonLabel(id: ContentReportReasonId): string {
  return CONTENT_REPORT_REASONS.find((r) => r.id === id)?.label ?? id
}

export function buildContentReportMailto(params: {
  song: Pick<Song, 'id' | 'title' | 'artist'>
  reasonId: ContentReportReasonId
  details?: string
  context: ContentReportContext
}): string {
  const { song, reasonId, details, context } = params
  const reason = getContentReportReasonLabel(reasonId)
  const contextLabel = context === 'leaderboard' ? 'Leaderboard' : 'Voting'

  const body = [
    'Hallo,',
    '',
    'ich möchte folgenden Song auf SongMash melden:',
    '',
    `Song-ID: ${song.id}`,
    `Titel: ${song.title}`,
    `Artist: ${song.artist}`,
    `Kontext: ${contextLabel}`,
    `Grund: ${reason}`,
    details?.trim() ? `Details: ${details.trim()}` : '',
    '',
    '—',
    'Gesendet über die SongMash Melden-Funktion.',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i + 1] === ''))
    .join('\n')

  const subject = `SongMash Meldung: ${song.title} – ${song.artist}`
  const paramsEncoded = new URLSearchParams({
    subject,
    body,
  })

  return `mailto:${legal.email}?${paramsEncoded.toString()}`
}
