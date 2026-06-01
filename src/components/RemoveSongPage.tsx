import { useState, type FormEvent } from 'react'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { useSongs } from '../context/SongContext'

interface RemoveSongPageProps {
  onBack?: () => void
}

export function RemoveSongPage({ onBack }: RemoveSongPageProps) {
  const { deleteSongByToken } = useSongs()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsDeleting(true)

    try {
      const { title } = await deleteSongByToken(token)
      setSuccess(`„${title}“ wurde entfernt.`)
      setToken('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    } finally {
      setIsDeleting(false)
    }
  }

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
          Gib den Lösch-Code ein, den du nach dem Einreichen erhalten hast. Ohne Code kann der Song
          nicht automatisch zugeordnet werden.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="deletion-token" className="mb-1.5 block text-sm font-medium text-neutral-300">
              Lösch-Code
            </label>
            <input
              id="deletion-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Code aus der Einreichungsbestätigung"
              className="input-field font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {error && <p className="alert-error">{error}</p>}
          {success && <p className="alert-success">{success}</p>}

          <button type="submit" disabled={!token.trim() || isDeleting} className="btn-primary w-full">
            {isDeleting && <Loader2 className="h-5 w-5 animate-spin" />}
            Song endgültig entfernen
          </button>
        </form>
      </div>
    </div>
  )
}
