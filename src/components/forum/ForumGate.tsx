import { useState, type FormEvent } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { buildForumPasswordRequestMailto } from '../../lib/buildForumPasswordRequestMailto'
import { ForumApiError, forumLogin } from '../../lib/forumApi'

interface ForumGateProps {
  onSuccess: () => void
}

export function ForumGate({ onSuccess }: ForumGateProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forumLogin(password)
      onSuccess()
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Anmeldung fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-8 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-lime-400" />
        <h1 className="page-title text-2xl">Community-Forum</h1>
        <p className="page-subtitle text-sm">
          Geschützter Bereich — gemeinsames Passwort eingeben.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="forum-password" className="mb-1.5 block text-sm text-neutral-400">
            Passwort
          </label>
          <input
            id="forum-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="Forum-Passwort"
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="alert-error text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          Betreten
        </button>
      </form>

      <p className="mt-6 text-center text-sm leading-relaxed text-neutral-500">
        Hast du schon ein Passwort? Oben eingeben und betreten. Noch keins? Wenn du mindestens
        einen Song auf SongMash eingereicht hast (mit Künstlernamen), kannst du es per{' '}
        <a
          href={buildForumPasswordRequestMailto()}
          className="text-lime-400/90 hover:text-lime-300"
        >
          E-Mail anfragen
        </a>{' '}
        (Kontakt wie im Impressum).
      </p>
    </div>
  )
}
