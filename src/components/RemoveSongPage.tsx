import { useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Loader2, Search, Trash2 } from 'lucide-react'
import { useSongs } from '../context/SongContext'
import { previewDeletionByToken, type DeletionPreview } from '../lib/deleteSongByToken'

interface RemoveSongPageProps {
  onBack?: () => void
}

function tokenTail(token: string): string {
  const t = token.trim()
  if (t.length <= 8) return t
  return `…${t.slice(-6)}`
}

export function RemoveSongPage({ onBack }: RemoveSongPageProps) {
  const { deleteSongByToken } = useSongs()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [preview, setPreview] = useState<DeletionPreview | null>(null)
  const [confirmedToken, setConfirmedToken] = useState<string | null>(null)
  const deleteRequestId = useRef(0)

  const resetPreview = () => {
    setPreview(null)
    setConfirmedToken(null)
  }

  const handleTokenChange = (value: string) => {
    setToken(value)
    setError('')
    if (confirmedToken !== null && value.trim() !== confirmedToken) {
      resetPreview()
    }
  }

  const handlePreview = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    resetPreview()
    setIsBusy(true)

    try {
      const trimmed = token.trim()
      const result = await previewDeletionByToken(trimmed)
      setPreview(result)
      setConfirmedToken(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code konnte nicht geprüft werden.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!preview || !confirmedToken || token.trim() !== confirmedToken) {
      setError('Bitte den Code erneut prüfen.')
      resetPreview()
      return
    }

    setError('')
    setSuccess('')
    const requestId = ++deleteRequestId.current
    setIsBusy(true)

    try {
      const { title } = await deleteSongByToken(confirmedToken)
      if (requestId !== deleteRequestId.current) return

      setSuccess(
        `„${title}“ wurde entfernt. Der Lösch-Code ${tokenTail(confirmedToken)} ist jetzt verbraucht und kann nicht erneut verwendet werden.`,
      )
      setToken('')
      resetPreview()
    } catch (err) {
      if (requestId !== deleteRequestId.current) return
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    } finally {
      if (requestId === deleteRequestId.current) {
        setIsBusy(false)
      }
    }
  }

  const canPreview = Boolean(token.trim()) && !isBusy
  const canConfirmDelete =
    Boolean(preview && confirmedToken && token.trim() === confirmedToken) && !isBusy

  return (
    <div className="mx-auto max-w-md">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>
      )}

      <div className="card">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-neutral-50">
          <Trash2 className="h-7 w-7 text-lime-400" />
          Song entfernen
        </h1>
        <p className="mb-6 text-sm text-neutral-400">
          Gib den Lösch-Code ein, den du nach dem Einreichen erhalten hast. Zuerst wird angezeigt,
          welcher Song gemeint ist — erst nach deiner Bestätigung wird er gelöscht.
        </p>

        <form onSubmit={handlePreview} className="space-y-4">
          <div>
            <label htmlFor="deletion-token" className="mb-1.5 block text-sm font-medium text-neutral-300">
              Lösch-Code
            </label>
            <input
              id="deletion-token"
              type="text"
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              placeholder="Code aus der Einreichungsbestätigung"
              className="input-field font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              Pro Song ein eigener Code. Nach dem Löschen ist der Code ungültig.
            </p>
          </div>

          {error && <p className="alert-error">{error}</p>}
          {success && <p className="alert-success">{success}</p>}

          {preview && confirmedToken && token.trim() === confirmedToken && (
            <div
              className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4"
              role="status"
            >
              <p className="text-sm font-medium text-amber-200">Dieser Song wird gelöscht:</p>
              <p className="mt-1 text-lg font-semibold text-neutral-50">{preview.title}</p>
              {preview.artist && (
                <p className="text-sm text-neutral-400">{preview.artist}</p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                Das kann nicht rückgängig gemacht werden. Prüfe Titel und Künstler, bevor du
                bestätigst.
              </p>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={!canConfirmDelete}
                className="btn-primary mt-4 w-full"
              >
                {isBusy && <Loader2 className="h-5 w-5 animate-spin" />}
                Ja, „{preview.title}“ endgültig entfernen
              </button>
              <button
                type="button"
                onClick={resetPreview}
                disabled={isBusy}
                className="btn-subtle mt-2 w-full"
              >
                Abbrechen
              </button>
            </div>
          )}

          {!preview && (
            <button type="submit" disabled={!canPreview} className="btn-primary w-full">
              {isBusy && <Loader2 className="h-5 w-5 animate-spin" />}
              <Search className="h-5 w-5" />
              Song anzeigen &amp; bestätigen
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
