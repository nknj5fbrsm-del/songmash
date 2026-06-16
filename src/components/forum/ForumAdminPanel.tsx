import { useEffect, useState, type ReactNode } from 'react'
import {
  ChevronDown,
  Download,
  Loader2,
  Pencil,
  Pin,
  PinOff,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  ForumApiError,
  forumAdminDeleteBoard,
  forumAdminDeleteCategory,
  forumAdminDownloadBackup,
  forumAdminPinBoard,
  forumAdminUpsertBoard,
  forumAdminUpsertCategory,
} from '../../lib/forumApi'
import type { ForumBoardSummary, ForumCategory } from '../../types/forum'
import { ForumMembersPanel } from './ForumMembersPanel'

interface ForumAdminPanelProps {
  categories: ForumCategory[]
  onChanged: () => void
}

type EditTarget =
  | { type: 'category'; id: string }
  | { type: 'board'; id: string }
  | null

function ForumAdminSection({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string
  icon: typeof Settings
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-amber-200/90"
      >
        <span className="inline-flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-amber-500/15 px-4 py-4">{children}</div>
      )}
    </div>
  )
}

export function ForumAdminPanel({ categories, onChanged }: ForumAdminPanelProps) {
  const [structureOpen, setStructureOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [structureError, setStructureError] = useState('')
  const [membersError, setMembersError] = useState('')
  const [catName, setCatName] = useState('')
  const [catDescription, setCatDescription] = useState('')
  const [boardName, setBoardName] = useState('')
  const [boardDescription, setBoardDescription] = useState('')
  const [boardCategoryId, setBoardCategoryId] = useState('')
  const [backupLoading, setBackupLoading] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editBoardCategoryId, setEditBoardCategoryId] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    if (categories.length === 0) {
      setBoardCategoryId('')
      return
    }
    setBoardCategoryId((current) =>
      current && categories.some((c) => c.id === current) ? current : categories[0].id,
    )
  }, [categories])

  const run = async (fn: () => Promise<void>) => {
    setStructureError('')
    try {
      await fn()
      onChanged()
    } catch (err) {
      setStructureError(err instanceof ForumApiError ? err.message : 'Aktion fehlgeschlagen.')
    }
  }

  const cancelEdit = () => {
    setEditTarget(null)
    setEditName('')
    setEditDescription('')
    setEditBoardCategoryId('')
  }

  const startEditCategory = (cat: ForumCategory) => {
    setEditTarget({ type: 'category', id: cat.id })
    setEditName(cat.name)
    setEditDescription(cat.description ?? '')
  }

  const startEditBoard = (board: ForumBoardSummary, categoryId: string) => {
    setEditTarget({ type: 'board', id: board.id })
    setEditName(board.name)
    setEditDescription(board.description ?? '')
    setEditBoardCategoryId(categoryId)
  }

  const saveEdit = async () => {
    if (!editTarget) return
    if (!editName.trim()) {
      setStructureError('Bitte einen Namen eingeben.')
      return
    }
    if (editTarget.type === 'board' && !editBoardCategoryId) {
      setStructureError('Bitte eine Kategorie auswählen.')
      return
    }

    setStructureError('')
    setEditSaving(true)
    try {
      if (editTarget.type === 'category') {
        await forumAdminUpsertCategory({
          categoryId: editTarget.id,
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        })
      } else {
        await forumAdminUpsertBoard({
          boardId: editTarget.id,
          categoryId: editBoardCategoryId,
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        })
      }
      cancelEdit()
      onChanged()
    } catch (err) {
      setStructureError(err instanceof ForumApiError ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setEditSaving(false)
    }
  }

  const renderEditForm = (showCategorySelect: boolean) => (
    <div className="space-y-2">
      {showCategorySelect && (
        <select
          value={editBoardCategoryId}
          onChange={(e) => setEditBoardCategoryId(e.target.value)}
          className="input-field w-full !py-2 !text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        maxLength={80}
        className="input-field w-full !py-2 !text-sm font-medium"
        autoFocus
      />
      <input
        type="text"
        value={editDescription}
        onChange={(e) => setEditDescription(e.target.value)}
        placeholder="Beschreibung (optional, max. 250 Zeichen)"
        maxLength={250}
        className="input-field w-full !py-2 !text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveEdit}
          disabled={editSaving || !editName.trim()}
          className="btn-primary !py-1.5 text-xs"
        >
          {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Speichern
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={editSaving}
          className="btn-secondary !py-1.5 text-xs"
        >
          <X className="h-3.5 w-3.5" />
          Abbrechen
        </button>
      </div>
    </div>
  )

  return (
    <div className="mb-6 space-y-3">
      <ForumAdminSection
        title="Forum-Verwaltung"
        icon={Settings}
        open={structureOpen}
        onToggle={() => setStructureOpen((v) => !v)}
      >
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
            <p className="mb-2 text-sm text-neutral-400">
              Vollständige Sicherung als JSON-Datei (Kategorien, Themen, Beiträge).
            </p>
            <button
              type="button"
              disabled={backupLoading}
              onClick={async () => {
                setStructureError('')
                setBackupLoading(true)
                try {
                  await forumAdminDownloadBackup()
                } catch (err) {
                  setStructureError(
                    err instanceof ForumApiError ? err.message : 'Backup fehlgeschlagen.',
                  )
                } finally {
                  setBackupLoading(false)
                }
              }}
              className="btn-secondary !py-2 text-sm"
            >
              {backupLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Forum sichern
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Neue Kategorie"
                className="input-field flex-1 !py-2 !text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  run(async () => {
                    if (!catName.trim()) {
                      setStructureError('Bitte einen Kategorienamen eingeben.')
                      return
                    }
                    const newId = await forumAdminUpsertCategory({
                      name: catName.trim(),
                      description: catDescription.trim() || undefined,
                    })
                    setCatName('')
                    setCatDescription('')
                    setBoardCategoryId(newId)
                  })
                }
                className="btn-secondary shrink-0"
              >
                Kategorie anlegen
              </button>
            </div>
            <input
              type="text"
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
              placeholder="Beschreibung (optional, max. 250 Zeichen)"
              maxLength={250}
              className="input-field w-full !py-2 !text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={boardCategoryId}
                onChange={(e) => setBoardCategoryId(e.target.value)}
                disabled={categories.length === 0}
                className="input-field flex-1 !py-2 !text-sm disabled:opacity-50"
              >
                {categories.length === 0 ? (
                  <option value="">Keine Kategorie vorhanden</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
              <input
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Neuer Unterbereich"
                className="input-field flex-1 !py-2 !text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  run(async () => {
                    if (!boardCategoryId) {
                      setStructureError('Bitte zuerst eine Kategorie anlegen oder auswählen.')
                      return
                    }
                    if (!boardName.trim()) {
                      setStructureError('Bitte einen Namen für den Unterbereich eingeben.')
                      return
                    }
                    await forumAdminUpsertBoard({
                      categoryId: boardCategoryId,
                      name: boardName.trim(),
                      description: boardDescription.trim() || undefined,
                    })
                    setBoardName('')
                    setBoardDescription('')
                  })
                }
                className="btn-secondary shrink-0"
              >
                Unterbereich anlegen
              </button>
            </div>
            <input
              type="text"
              value={boardDescription}
              onChange={(e) => setBoardDescription(e.target.value)}
              placeholder="Beschreibung (optional, max. 250 Zeichen)"
              maxLength={250}
              className="input-field w-full !py-2 !text-sm"
            />
          </div>

          <ul className="space-y-2 text-sm">
            {categories.map((cat) => {
              const editingCategory =
                editTarget?.type === 'category' && editTarget.id === cat.id
              return (
              <li key={cat.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
                {editingCategory ? (
                  renderEditForm(false)
                ) : (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-neutral-200">{cat.name}</span>
                    {cat.description && (
                      <p className="mt-0.5 text-xs text-neutral-500">{cat.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => startEditCategory(cat)}
                    className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-800 hover:text-lime-300"
                    aria-label="Kategorie bearbeiten"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      run(async () => {
                        if (!window.confirm(`Kategorie „${cat.name}" wirklich löschen?`)) return
                        await forumAdminDeleteCategory(cat.id)
                      })
                    }
                    className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-800 hover:text-red-300"
                    aria-label="Kategorie löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  </div>
                </div>
                )}
                <ul className="mt-2 space-y-1 pl-2">
                  {cat.boards.map((board) => {
                    const editingBoard =
                      editTarget?.type === 'board' && editTarget.id === board.id
                    return (
                    <li key={board.id} className="rounded-lg py-1">
                      {editingBoard ? (
                        renderEditForm(true)
                      ) : (
                      <div className="flex items-center justify-between gap-2 text-neutral-500">
                      <div>
                        <span className="inline-flex items-center gap-1.5">
                          {board.isPinned && (
                            <Pin className="h-3 w-3 shrink-0 text-amber-400" aria-label="Angepinnt" />
                          )}
                          {board.name}
                        </span>
                        {board.description && (
                          <p className="text-xs text-neutral-600">{board.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          run(async () => {
                            await forumAdminPinBoard(board.id, !board.isPinned)
                          })
                        }
                        className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-800 hover:text-amber-300"
                        aria-label={board.isPinned ? 'Unterbereich lösen' : 'Unterbereich anpinnen'}
                        title={board.isPinned ? 'Lösen' : 'Anpinnen'}
                      >
                        {board.isPinned ? (
                          <PinOff className="h-3.5 w-3.5" />
                        ) : (
                          <Pin className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditBoard(board, cat.id)}
                        className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-800 hover:text-lime-300"
                        aria-label="Unterbereich bearbeiten"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          run(async () => {
                            if (!window.confirm(`Unterbereich „${board.name}" wirklich löschen?`))
                              return
                            await forumAdminDeleteBoard(board.id)
                          })
                        }
                        className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-800 hover:text-red-300"
                        aria-label="Unterbereich löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      </div>
                      </div>
                      )}
                    </li>
                    )
                  })}
                </ul>
              </li>
              )
            })}
          </ul>

          {structureError && <p className="text-sm text-red-300">{structureError}</p>}
      </ForumAdminSection>

      <ForumAdminSection
        title="Mitgliederverwaltung"
        icon={Users}
        open={membersOpen}
        onToggle={() => setMembersOpen((v) => !v)}
      >
        <ForumMembersPanel
          embedded
          enabled={membersOpen}
          onError={setMembersError}
        />
        {membersError && <p className="text-sm text-red-300">{membersError}</p>}
      </ForumAdminSection>
    </div>
  )
}
