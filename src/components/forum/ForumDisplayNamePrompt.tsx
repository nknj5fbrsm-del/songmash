import { useState, type FormEvent } from 'react'
import { User } from 'lucide-react'
import { writeForumDisplayName } from '../../lib/forumStorage'

interface ForumDisplayNamePromptProps {
  onComplete: (name: string) => void
}

export function ForumDisplayNamePrompt({ onComplete }: ForumDisplayNamePromptProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Mindestens 2 Zeichen.')
      return
    }
    if (trimmed.length > 32) {
      setError('Maximal 32 Zeichen.')
      return
    }
    writeForumDisplayName(trimmed)
    onComplete(trimmed)
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-6 text-center">
        <User className="mx-auto mb-3 h-10 w-10 text-lime-400" />
        <h2 className="text-xl font-bold text-neutral-50">Wie sollen wir dich nennen?</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Dein Anzeigename erscheint unter deinen Beiträgen.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value.slice(0, 32))
            setError('')
          }}
          className="input-field"
          placeholder="z. B. BeatMaker42"
          maxLength={32}
          autoFocus
          required
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button type="submit" className="btn-primary w-full">
          Weiter ins Forum
        </button>
      </form>
    </div>
  )
}
