import { useEffect, useId, useState } from 'react'
import { Copy, Flag, X } from 'lucide-react'
import { legal } from '../config/legal'
import {
  buildContentReportMailto,
  CONTENT_REPORT_REASONS,
  type ContentReportContext,
  type ContentReportReasonId,
} from '../lib/buildContentReportMailto'
import {
  canSubmitReportToday,
  markSongReported,
  remainingReportsToday,
} from '../lib/contentReportStorage'
import { isTurnstileEnabled } from '../lib/turnstileConfig'
import type { Song } from '../types/song'
import { TurnstileWidget } from './TurnstileWidget'

interface ReportContentModalProps {
  open: boolean
  song: Pick<Song, 'id' | 'title' | 'artist'>
  context: ContentReportContext
  onClose: () => void
  onReported: () => void
}

export function ReportContentModal({
  open,
  song,
  context,
  onClose,
  onReported,
}: ReportContentModalProps) {
  const titleId = useId()
  const honeypotId = useId()
  const [reasonId, setReasonId] = useState<ContentReportReasonId | ''>('')
  const [details, setDetails] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [copyHint, setCopyHint] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setReasonId('')
      setDetails('')
      setConfirmed(false)
      setHoneypot('')
      setTurnstileToken(null)
      setTurnstileKey((k) => k + 1)
      setCopyHint('')
      setError('')
      return
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const turnstileOk = !isTurnstileEnabled() || Boolean(turnstileToken)
  const dailyOk = canSubmitReportToday()
  const canSend =
    dailyOk && reasonId !== '' && confirmed && turnstileOk && honeypot.trim() === ''

  const handleSend = () => {
    if (!canSend || !reasonId) return
    if (honeypot.trim()) return

    markSongReported(song.id)
    const mailto = buildContentReportMailto({
      song,
      reasonId,
      details,
      context,
    })

    window.location.href = mailto
    onReported()
    onClose()
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(legal.email)
      setCopyHint('E-Mail kopiert')
      window.setTimeout(() => setCopyHint(''), 2000)
    } catch {
      setError('E-Mail konnte nicht kopiert werden.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card relative z-10 max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto shadow-2xl shadow-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flag className="h-6 w-6 shrink-0 text-lime-400" aria-hidden />
            <h2 id={titleId} className="text-xl font-bold text-neutral-50">
              Inhalt melden
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary shrink-0 px-3 py-2"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-neutral-400">
          <strong className="text-neutral-200">{song.title}</strong>
          <span className="text-neutral-500"> · {song.artist}</span>
        </p>

        {!dailyOk ? (
          <p className="alert-error text-sm">
            Tageslimit für Meldungen erreicht. Bitte morgen erneut versuchen oder schreib uns
            direkt an{' '}
            <a href={`mailto:${legal.email}`} className="text-lime-400/90 hover:text-lime-300">
              {legal.email}
            </a>
            .
          </p>
        ) : (
          <>
            <p className="mb-4 text-xs text-neutral-500">
              Noch {remainingReportsToday()} Meldung(en) heute möglich · pro Song nur einmal
            </p>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-neutral-300">Grund der Meldung</legend>
              {CONTENT_REPORT_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-sm text-neutral-300 transition-colors hover:border-neutral-700"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={reason.id}
                    checked={reasonId === reason.id}
                    onChange={() => setReasonId(reason.id)}
                    className="h-4 w-4 border-neutral-600 bg-neutral-900 text-lime-400 focus:ring-lime-400/30"
                  />
                  {reason.label}
                </label>
              ))}
            </fieldset>

            <div className="mt-4">
              <label htmlFor="report-details" className="mb-1.5 block text-sm font-medium text-neutral-300">
                Details (optional)
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 300))}
                rows={3}
                placeholder="Was genau verstößt gegen unsere Regeln?"
                className="input-field resize-none text-sm"
              />
              <p className="mt-1 text-xs text-neutral-500">{details.length}/300</p>
            </div>

            <label
              htmlFor={honeypotId}
              className="pointer-events-none fixed -left-[10000px] h-0 w-0 overflow-hidden opacity-0"
              aria-hidden
            >
              Website
              <input
                id={honeypotId}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-700 bg-neutral-800/40 p-4">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-600 bg-neutral-900 text-lime-400 focus:ring-lime-400/30"
              />
              <span className="text-sm leading-relaxed text-neutral-300">
                Ich melde in gutem Glauben einen mutmaßlichen Regelverstoß.
              </span>
            </label>

            {isTurnstileEnabled() && (
              <div className="mt-4">
                <TurnstileWidget
                  key={turnstileKey}
                  onToken={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>
            )}

            {error && <p className="alert-error mt-4 text-sm">{error}</p>}

            <p className="mt-4 text-xs text-neutral-500">
              Es öffnet sich dein E-Mail-Programm mit einer vorausgefüllten Nachricht. Falls das
              nicht klappt:{' '}
              <button
                type="button"
                onClick={copyEmail}
                className="inline-flex items-center gap-1 text-lime-400/90 hover:text-lime-300"
              >
                <Copy className="h-3 w-3" />
                {legal.email} kopieren
              </button>
              {copyHint && <span className="ml-2 text-lime-400/80">{copyHint}</span>}
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Abbrechen
              </button>
              <button
                type="button"
                disabled={!canSend}
                onClick={handleSend}
                className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Meldung per E-Mail senden
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
