import { useState, type FormEvent } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { buildForumPasswordRequestMailto } from '../../lib/buildForumPasswordRequestMailto'
import { ForumApiError, forumLogin } from '../../lib/forumApi'

interface ForumGateProps {
  onSuccess: (displayName?: string) => void
}

export function ForumGate({ onSuccess }: ForumGateProps) {
  const [credential, setCredential] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await forumLogin(credential)
      onSuccess(result.displayName)
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
          Geschützter Bereich — persönlichen Zugangscode oder (übergangsweise) gemeinsames
          Passwort eingeben.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="forum-credential" className="mb-1.5 block text-sm text-neutral-400">
            Zugangscode oder Passwort
          </label>
          <input
            id="forum-credential"
            type="password"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            className="input-field"
            placeholder="SM-XXXX-XXXX oder Forum-Passwort"
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
        Noch keinen persönlichen Code? Wenn du mindestens einen Song auf SongMash eingereicht hast,
        kannst du einen per{' '}
        <a
          href={buildForumPasswordRequestMailto()}
          className="text-lime-400/90 hover:text-lime-300"
        >
          E-Mail anfragen
        </a>
        . Bitte nenne dabei deinen{' '}
        <span className="text-neutral-400">gewünschten Anzeigenamen</span> und deinen eingereichten
        Song (Kontakt wie im Impressum).
      </p>
    </div>
  )
}
