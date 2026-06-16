import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Ban,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Search,
  Trash2,
  UserPlus,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import {
  ForumApiError,
  forumAdminCreateMember,
  forumAdminDeleteMember,
  forumAdminListMembers,
  forumAdminRegenerateMemberCode,
  forumAdminSetMemberActive,
} from '../../lib/forumApi'
import { formatForumDate } from '../../lib/forumFormat'
import type { ForumMember } from '../../types/forum'

interface ForumMembersPanelProps {
  onError: (message: string) => void
  /** Ohne eigene Karte/Überschrift — für eingebetteten Abschnitt */
  embedded?: boolean
  /** Mitglieder erst laden, wenn der Abschnitt geöffnet ist */
  enabled?: boolean
}

const TOAST_MS = 2000

function matchesSearch(member: ForumMember, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    member.displayName.toLowerCase().includes(q) ||
    (member.note?.toLowerCase().includes(q) ?? false)
  )
}

export function ForumMembersPanel({
  onError,
  embedded = false,
  enabled = true,
}: ForumMembersPanelProps) {
  const [members, setMembers] = useState<ForumMember[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [revealedCode, setRevealedCode] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const loadMembers = useCallback(async () => {
    setLoading(true)
    onError('')
    try {
      const data = await forumAdminListMembers()
      setMembers(data.members)
    } catch (err) {
      onError(err instanceof ForumApiError ? err.message : 'Mitglieder konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    if (!enabled) return
    void loadMembers()
  }, [loadMembers, enabled])

  const filteredMembers = useMemo(
    () => members.filter((m) => matchesSearch(m, search)),
    [members, search],
  )

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      showToast('Zugangscode kopiert')
    } catch {
      onError('Kopieren fehlgeschlagen.')
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      onError('Bitte einen Anzeigenamen eingeben.')
      return
    }
    setCreating(true)
    onError('')
    try {
      const data = await forumAdminCreateMember({
        name: name.trim(),
        note: note.trim() || undefined,
      })
      setName('')
      setNote('')
      setRevealedCode(data.accessCode)
      await loadMembers()
    } catch (err) {
      onError(err instanceof ForumApiError ? err.message : 'Mitglied konnte nicht angelegt werden.')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (member: ForumMember) => {
    setActionId(member.id)
    onError('')
    try {
      await forumAdminSetMemberActive(member.id, !member.isActive)
      await loadMembers()
    } catch (err) {
      onError(err instanceof ForumApiError ? err.message : 'Status konnte nicht geändert werden.')
    } finally {
      setActionId(null)
    }
  }

  const handleRegenerateCode = async (member: ForumMember) => {
    if (!window.confirm(`Neuen Zugangscode für „${member.displayName}" erzeugen? Der alte Code wird ungültig.`)) {
      return
    }
    setActionId(member.id)
    onError('')
    try {
      const data = await forumAdminRegenerateMemberCode(member.id)
      setRevealedCode(data.accessCode)
      await loadMembers()
    } catch (err) {
      onError(err instanceof ForumApiError ? err.message : 'Code konnte nicht erneuert werden.')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (member: ForumMember) => {
    if (!window.confirm(`Mitglied „${member.displayName}" wirklich löschen?`)) return
    setActionId(member.id)
    onError('')
    try {
      await forumAdminDeleteMember(member.id)
      await loadMembers()
    } catch (err) {
      onError(err instanceof ForumApiError ? err.message : 'Löschen fehlgeschlagen.')
    } finally {
      setActionId(null)
    }
  }

  const memberCountLabel =
    !loading && members.length > 0
      ? search.trim()
        ? `${filteredMembers.length} von ${members.length}`
        : `${members.length} gesamt`
      : null

  return (
    <div className={embedded ? 'relative' : 'relative rounded-xl border border-neutral-800 bg-neutral-900/40 p-3'}>
      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-lime-400/30 bg-neutral-900/95 px-4 py-2 text-sm text-lime-300 shadow-lg backdrop-blur-sm"
        >
          <Check className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}

      {!embedded && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-lime-400" />
            <h3 className="text-sm font-semibold text-neutral-200">Forum-Mitglieder</h3>
          </div>
          {memberCountLabel && (
            <span className="text-[11px] text-neutral-600">{memberCountLabel}</span>
          )}
        </div>
      )}

      <div className="mb-2 flex flex-col gap-1.5 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 32))}
          placeholder="Anzeigename"
          className="input-field min-w-0 flex-1 !py-1.5 !text-sm"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 250))}
          placeholder="Notiz (optional)"
          className="input-field min-w-0 flex-1 !py-1.5 !text-sm"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="btn-secondary shrink-0 !py-1.5 text-xs"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
          Anlegen
        </button>
      </div>

      {revealedCode && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-lime-400/30 bg-lime-400/10 px-2.5 py-1.5 text-xs">
          <div className="min-w-0">
            <span className="text-neutral-500">Neuer Code: </span>
            <code className="font-mono text-lime-300">{revealedCode}</code>
          </div>
          <button
            type="button"
            onClick={() => void copyCode(revealedCode)}
            className="btn-secondary shrink-0 !px-2 !py-1"
            title="Kopieren"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="relative mb-1.5 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name oder Notiz suchen…"
            className="input-field w-full !py-1.5 !pl-8 !text-sm"
          />
        </div>
        {embedded && memberCountLabel && (
          <span className="shrink-0 text-[11px] text-neutral-600">{memberCountLabel}</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-2 text-xs text-neutral-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Lädt…
        </div>
      )}

      {!loading && members.length === 0 && (
        <p className="py-2 text-xs text-neutral-500">Noch keine Mitglieder angelegt.</p>
      )}

      {!loading && members.length > 0 && filteredMembers.length === 0 && (
        <p className="py-2 text-xs text-neutral-500">Keine Treffer für „{search.trim()}“.</p>
      )}

      {!loading && filteredMembers.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-neutral-800">
          <div className="sticky top-0 z-[1] hidden grid-cols-[minmax(0,1fr)_4.5rem_5rem_5.5rem] gap-2 border-b border-neutral-800 bg-neutral-950/95 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-neutral-600 sm:grid">
            <span>Name</span>
            <span>Status</span>
            <span>Zuletzt</span>
            <span className="text-right">Aktionen</span>
          </div>
          <ul className="divide-y divide-neutral-800/80">
            {filteredMembers.map((member) => {
              const busy = actionId === member.id
              return (
                <li
                  key={member.id}
                  className="grid grid-cols-1 items-center gap-1 px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_5rem_5.5rem] sm:gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-200" title={member.displayName}>
                      {member.displayName}
                    </p>
                    {member.note && (
                      <p className="truncate text-[11px] text-neutral-500" title={member.note}>
                        {member.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:contents">
                    <span
                      className={`inline-flex w-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium sm:justify-self-start ${
                        member.isActive
                          ? 'bg-lime-400/15 text-lime-300'
                          : 'bg-red-400/10 text-red-300'
                      }`}
                    >
                      {member.isActive ? 'Aktiv' : 'Gesperrt'}
                    </span>

                    <span
                      className="text-[11px] text-neutral-600 sm:truncate"
                      title={
                        member.lastSeenAt
                          ? `Zuletzt: ${formatForumDate(member.lastSeenAt)}`
                          : 'Noch nie eingeloggt'
                      }
                    >
                      {member.lastSeenAt ? formatForumDate(member.lastSeenAt) : '—'}
                    </span>

                    <div className="flex shrink-0 justify-end gap-0.5 sm:justify-self-end">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleToggleActive(member)}
                        className="btn-secondary !p-1.5"
                        title={member.isActive ? 'Sperren' : 'Freischalten'}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : member.isActive ? (
                          <Ban className="h-3.5 w-3.5" />
                        ) : (
                          <UserRoundCheck className="h-3.5 w-3.5 text-lime-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRegenerateCode(member)}
                        className="btn-secondary !p-1.5"
                        title="Neuer Code"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete(member)}
                        className="btn-secondary !p-1.5 text-red-300"
                        title="Löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
