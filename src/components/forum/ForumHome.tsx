import { ChevronRight, MessageSquare } from 'lucide-react'
import { isForumBoardUnread } from '../../lib/forumReadStorage'
import type { ForumCategory } from '../../types/forum'
import { ForumUnreadBadge } from './ForumUnreadBadge'

interface ForumHomeProps {
  categories: ForumCategory[]
  readRevision: number
  onOpenBoard: (boardId: string) => void
}

export function ForumHome({ categories, readRevision, onOpenBoard }: ForumHomeProps) {
  void readRevision
  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <section key={category.id}>
          <h2 className="mb-1 text-lg font-bold text-neutral-50">{category.name}</h2>
          {category.description && (
            <p className="mb-3 text-sm text-neutral-500">{category.description}</p>
          )}
          <ul className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60">
            {category.boards.map((board, index) => (
              <li
                key={board.id}
                className={index > 0 ? 'border-t border-neutral-800/80' : undefined}
              >
                <button
                  type="button"
                  onClick={() => onOpenBoard(board.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-800/40"
                >
                  <MessageSquare className="h-5 w-5 shrink-0 text-lime-400/80" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium text-neutral-100">
                      {board.name}
                      {isForumBoardUnread(board.id, board.latestActivityAt) && <ForumUnreadBadge />}
                    </p>
                    {board.description && (
                      <p className="mt-0.5 truncate text-sm text-neutral-500">{board.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-neutral-600">
                    {board.threadCount} {board.threadCount === 1 ? 'Thema' : 'Themen'}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
