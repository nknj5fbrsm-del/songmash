import { Trophy } from 'lucide-react'
import { useSongs } from '../context/SongContext'

export function LeaderboardPage() {
  const { songs } = useSongs()
  const ranked = [...songs].sort((a, b) => b.eloRating - a.eloRating)

  return (
    <div>
      <header className="mb-8 text-center">
        <h1 className="page-title flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-lime-400" />
          Leaderboard
        </h1>
        <p className="page-subtitle">
          Die Perlen der Community — sortiert nach Elo-Rating.
        </p>
      </header>

      {ranked.length === 0 ? (
        <p className="text-center text-neutral-500">Noch keine Songs vorhanden.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500">
                <th className="px-6 py-4 font-semibold">#</th>
                <th className="px-6 py-4 font-semibold">Titel</th>
                <th className="px-6 py-4 font-semibold">Artist</th>
                <th className="hidden px-6 py-4 font-semibold sm:table-cell">Tags</th>
                <th className="px-6 py-4 text-right font-semibold">Elo</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((song, index) => (
                <tr
                  key={song.id}
                  className={`border-b border-neutral-800/60 transition-colors hover:bg-neutral-800/30 ${
                    index < 3 ? 'bg-lime-400/[0.03]' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                        index === 0
                          ? 'bg-lime-400/20 text-lime-300'
                          : index === 1
                            ? 'bg-lime-400/10 text-lime-400/80'
                            : index === 2
                              ? 'bg-neutral-800 text-neutral-300'
                              : 'text-neutral-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {song.coverUrl ? (
                        <img
                          src={song.coverUrl}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-xs text-neutral-500">
                          ♪
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-neutral-100">{song.title}</div>
                        {song.description && (
                          <div className="line-clamp-1 text-xs text-neutral-500">{song.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-400">{song.artist}</td>
                  <td className="hidden px-6 py-4 sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {song.techStackTags.map((tag) => (
                        <span key={tag} className="tag px-2">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-lime-400">
                    {song.eloRating}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
