import { useState } from 'react'
import { AlertTriangle, ArrowLeft, Loader2, Lock, Shield, Trash2 } from 'lucide-react'
import { useModerator } from '../hooks/useModerator'
import { useSongs } from '../context/SongContext'

interface ModerationPageProps {
  onBack?: () => void
}

export function ModerationPage({ onBack }: ModerationPageProps) {
  const { unlocked, unlock, lock, isConfigured } = useModerator()
  const { songs, removeSong, storageMode } = useSongs()
  const [keyInput, setKeyInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState('')

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <Shield className="mx-auto mb-4 h-10 w-10 text-amber-400" />
        <h2 className="text-lg font-semibold text-neutral-100">Moderation nicht konfiguriert</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Supabase ist nicht eingerichtet. Moderator-Schlüssel wird nur serverseitig als{' '}
          <code className="text-amber-300">MODERATOR_KEY</code> in Supabase Secrets gespeichert.
        </p>
        {onBack && (
          <button type="button" onClick={onBack} className="btn-secondary mt-6">
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </button>
        )}
      </div>
    )
  }

  if (!unlocked) {
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
        <header className="mb-8 text-center">
          <Shield className="mx-auto mb-3 h-10 w-10 text-lime-400" />
          <h1 className="page-title text-2xl">Moderation</h1>
          <p className="page-subtitle text-sm">Moderator-Schlüssel eingeben</p>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setAuthError('')
            void (async () => {
              setAuthLoading(true)
              const ok = await unlock(keyInput)
              setAuthLoading(false)
              if (!ok) setAuthError('Ungültiger Schlüssel.')
            })()
          }}
          className="card space-y-4"
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Moderator-Key"
              className="input-field !pl-10"
            />
          </div>
          {authError && <p className="text-sm text-red-300">{authError}</p>}
          <button
            type="submit"
            disabled={authLoading}
            className="btn-primary w-full py-3 text-base disabled:opacity-60"
          >
            {authLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Prüfe …
              </>
            ) : (
              'Entsperren'
            )}
          </button>
        </form>
      </div>
    )
  }

  const handleDelete = async (songId: string) => {
    setDeletingId(songId)
    setActionMessage('')
    try {
      await removeSong(songId)
      setConfirmId(null)
      setActionMessage('Song gelöscht. Elo-Ratings wurden neu berechnet.')
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : 'Löschen fehlgeschlagen.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2 text-2xl">
            <Shield className="h-7 w-7 text-lime-400" />
            Moderation
          </h1>
          <p className="page-subtitle text-sm">
            Songs entfernen · Storage aufräumen · Elo neu berechnen
          </p>
        </div>
        <button
          type="button"
          onClick={lock}
          className="btn-secondary py-2"
        >
          Sperren
        </button>
      </header>

      {storageMode === 'local' && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Lokaler Modus: Löschen ohne Supabase — Elo-Neuberechnung nur mit Vote-Historie in der DB.
        </div>
      )}

      <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Beim Löschen werden zugehörige Votes entfernt und alle Elo-Werte aus den
          verbleibenden Votes neu berechnet (Start: 1500).
        </p>
      </div>

      {actionMessage && <p className="alert-success mb-4">{actionMessage}</p>}

      <div className="space-y-3">
        {songs.map((song) => (
          <div
            key={song.id}
            className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4"
          >
            {song.coverUrl ? (
              <img
                src={song.coverUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-500">
                ♪
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-neutral-100">{song.title}</div>
              <div className="text-sm text-neutral-400">{song.artist}</div>
              {song.description && (
                <div className="mt-1 text-xs leading-relaxed break-words text-neutral-500">
                  {song.description}
                </div>
              )}
              <div className="mt-1 font-mono text-xs text-lime-400">Elo {song.eloRating}</div>
            </div>

            {confirmId === song.id ? (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={deletingId === song.id}
                  onClick={() => handleDelete(song.id)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {deletingId === song.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Endgültig löschen
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  className="btn-secondary px-3 py-2"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmId(song.id)}
                className="shrink-0 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
              >
                Entfernen
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
