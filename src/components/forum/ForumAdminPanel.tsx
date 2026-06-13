import { useEffect, useState } from 'react'
import { ChevronDown, Download, Loader2, Settings, Trash2 } from 'lucide-react'
import {
  ForumApiError,
  forumAdminDeleteBoard,
  forumAdminDeleteCategory,
  forumAdminDownloadBackup,
  forumAdminUpsertBoard,
  forumAdminUpsertCategory,
} from '../../lib/forumApi'
import type { ForumCategory } from '../../types/forum'

interface ForumAdminPanelProps {
  categories: ForumCategory[]
  onChanged: () => void
}

export function ForumAdminPanel({ categories, onChanged }: ForumAdminPanelProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [catName, setCatName] = useState('')
  const [catDescription, setCatDescription] = useState('')
  const [boardName, setBoardName] = useState('')
  const [boardDescription, setBoardDescription] = useState('')
  const [boardCategoryId, setBoardCategoryId] = useState('')
  const [backupLoading, setBackupLoading] = useState(false)

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
    setError('')
    try {
      await fn()
      onChanged()
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Aktion fehlgeschlagen.')
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-amber-200/90"
      >
        <span className="inline-flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Forum-Verwaltung
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-amber-500/15 px-4 py-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
            <p className="mb-2 text-sm text-neutral-400">
              Vollständige Sicherung als JSON-Datei (Kategorien, Themen, Beiträge).
            </p>
            <button
              type="button"
              disabled={backupLoading}
              onClick={async () => {
                setError('')
                setBackupLoading(true)
                try {
                  await forumAdminDownloadBackup()
                } catch (err) {
                  setError(
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
                      setError('Bitte einen Kategorienamen eingeben.')
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
                      setError('Bitte zuerst eine Kategorie anlegen oder auswählen.')
                      return
                    }
                    if (!boardName.trim()) {
                      setError('Bitte einen Namen für den Unterbereich eingeben.')
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
            {categories.map((cat) => (
              <li key={cat.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-neutral-200">{cat.name}</span>
                    {cat.description && (
                      <p className="mt-0.5 text-xs text-neutral-500">{cat.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      run(async () => {
                        if (!window.confirm(`Kategorie „${cat.name}" wirklich löschen?`)) return
                        await forumAdminDeleteCategory(cat.id)
                      })
                    }
                    className="text-neutral-600 hover:text-red-300"
                    aria-label="Kategorie löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <ul className="mt-2 space-y-1 pl-2">
                  {cat.boards.map((board) => (
                    <li key={board.id} className="flex items-center justify-between gap-2 text-neutral-500">
                      <div>
                        <span>{board.name}</span>
                        {board.description && (
                          <p className="text-xs text-neutral-600">{board.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          run(async () => {
                            if (!window.confirm(`Unterbereich „${board.name}" wirklich löschen?`))
                              return
                            await forumAdminDeleteBoard(board.id)
                          })
                        }
                        className="text-neutral-600 hover:text-red-300"
                        aria-label="Unterbereich löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      )}
    </div>
  )
}
