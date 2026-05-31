import { useMemo, useRef, useState } from 'react'
import { Headphones, Search, Trophy } from 'lucide-react'
import { useSongs } from '../context/SongContext'
import { getPlayableAudioUrl } from '../lib/audioProxy'
import type { Song } from '../types/song'

export function LeaderboardPage() {
  const { songs } = useSongs()
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  const ranked = useMemo(
    () =>
      [...songs]
        .sort((a, b) => b.eloRating - a.eloRating)
        .map((song, index) => ({ song, rank: index + 1 })),
    [songs],
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return ranked
    return ranked.filter(
      ({ song }) =>
        song.title.toLowerCase().includes(term) || song.artist.toLowerCase().includes(term),
    )
  }, [ranked, query])

  const togglePlayer = (songId: string) => {
    setExpandedId((current) => (current === songId ? null : songId))
  }

  const pauseOthers = (songId: string) => {
    audioRefs.current.forEach((audio, id) => {
      if (id !== songId) audio.pause()
    })
  }

  const registerAudio = (songId: string, el: HTMLAudioElement | null) => {
    if (el) audioRefs.current.set(songId, el)
    else audioRefs.current.delete(songId)
  }

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
        <>
          <div className="relative mx-auto mb-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titel oder Artist…"
              className="input-field !pl-10"
            />
          </div>

          {query.trim() && (
            <p className="mb-4 text-center text-xs text-neutral-500">
              {filtered.length} von {ranked.length} Songs
            </p>
          )}

          {filtered.length === 0 ? (
            <p className="text-center text-neutral-500">Keine Treffer für „{query.trim()}“.</p>
          ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500">
                <th className="px-6 py-4 font-semibold">#</th>
                <th className="px-6 py-4 font-semibold">Titel</th>
                <th className="px-6 py-4 font-semibold">Artist</th>
                <th className="hidden px-6 py-4 font-semibold sm:table-cell">Tags</th>
                <th className="px-4 py-4 font-semibold sm:px-6">
                  <span className="sr-only">Anhören</span>
                  <Headphones className="mx-auto h-4 w-4" aria-hidden />
                </th>
                <th className="px-6 py-4 text-right font-semibold">Elo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ song, rank }) => (
                <LeaderboardRow
                  key={song.id}
                  song={song}
                  rank={rank}
                  expanded={expandedId === song.id}
                  onToggle={() => togglePlayer(song.id)}
                  onPlay={() => pauseOthers(song.id)}
                  registerAudio={registerAudio}
                />
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  )
}

function LeaderboardRow({
  song,
  rank,
  expanded,
  onToggle,
  onPlay,
  registerAudio,
}: {
  song: Song
  rank: number
  expanded: boolean
  onToggle: () => void
  onPlay: () => void
  registerAudio: (songId: string, el: HTMLAudioElement | null) => void
}) {
  return (
    <>
      <tr
        className={`border-b border-neutral-800/60 transition-colors hover:bg-neutral-800/30 ${
          rank <= 3 ? 'bg-lime-400/[0.03]' : ''
        } ${expanded ? 'bg-neutral-800/20' : ''}`}
      >
        <td className="px-6 py-4">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm font-bold ${
              rank === 1
                ? 'bg-lime-400/20 text-lime-300'
                : rank === 2
                  ? 'bg-lime-400/10 text-lime-400/80'
                  : rank === 3
                    ? 'bg-neutral-800 text-neutral-300'
                    : 'text-neutral-500'
            }`}
          >
            {rank}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            {song.coverUrl ? (
              <img src={song.coverUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-xs text-neutral-500">
                ♪
              </div>
            )}
            <div>
              <div className="font-medium text-neutral-100">{song.title}</div>
              {song.description && (
                <div className="text-xs leading-relaxed break-words text-neutral-500">
                  {song.description}
                </div>
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
        <td className="px-4 py-4 text-center sm:px-6">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? `${song.title} ausblenden` : `${song.title} anhören`}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              expanded
                ? 'bg-lime-400 text-neutral-950'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-lime-400'
            }`}
          >
            <Headphones className="h-4 w-4" />
          </button>
        </td>
        <td className="px-6 py-4 text-right font-mono font-semibold text-lime-400">
          {song.eloRating}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-neutral-800/60 bg-neutral-800/10">
          <td colSpan={6} className="px-6 py-4">
            <div className="mx-auto max-w-xl rounded-xl bg-neutral-800/50 p-3">
              <audio
                ref={(el) => registerAudio(song.id, el)}
                src={getPlayableAudioUrl(song.audioUrl)}
                controls
                autoPlay
                preload="metadata"
                className="w-full"
                onPlay={onPlay}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
