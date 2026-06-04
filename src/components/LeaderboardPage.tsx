import { useMemo, useRef, useState } from 'react'
import { Headphones, Search, Trophy } from 'lucide-react'
import { useSongs } from '../context/SongContext'
import {
  useWeekCompetitionContext,
  WeekCompetitionProvider,
} from '../context/WeekCompetitionContext'
import { getPlayableAudioUrl } from '../lib/audioProxy'
import type { Song } from '../types/song'
import { HallOfFame } from './HallOfFame'
import { WeekCompetitionStrip } from './WeekCompetitionStrip'

export function LeaderboardPage() {
  return (
    <WeekCompetitionProvider>
      <LeaderboardPageContent />
    </WeekCompetitionProvider>
  )
}

function LeaderboardPageContent() {
  const { songs, voteCounts, totalVoteRounds } = useSongs()
  const { hallOfFame } = useWeekCompetitionContext()
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
      <header className="mb-6 text-center">
        <h1 className="page-title flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-lime-400" />
          Leaderboard
        </h1>
        <p className="page-subtitle">
          Die Perlen der Community — sortiert nach Elo-Rating.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Abstimmungsrunden gesamt: {totalVoteRounds}
        </p>
        <WeekCompetitionStrip className="mt-5" />
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
        <div className="-mx-4 overflow-x-auto overscroll-x-contain sm:mx-0">
          <div className="inline-block min-w-full rounded-2xl border border-neutral-800 bg-neutral-900/80">
          <table className="w-full min-w-[22rem] text-left">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500">
                <th className="px-2 py-3 font-semibold sm:px-6 sm:py-4">#</th>
                <th className="px-2 py-3 font-semibold sm:px-6 sm:py-4">Titel</th>
                <th className="hidden px-6 py-4 font-semibold sm:table-cell">Artist</th>
                <th className="w-11 px-1 py-3 font-semibold sm:w-auto sm:px-6 sm:py-4">
                  <span className="sr-only">Anhören</span>
                  <Headphones className="mx-auto h-4 w-4" aria-hidden />
                </th>
                <th className="whitespace-nowrap px-2 py-3 text-right font-semibold sm:px-6 sm:py-4">
                  Votes
                </th>
                <th className="whitespace-nowrap px-2 py-3 text-right font-semibold sm:px-6 sm:py-4">
                  Elo
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ song, rank }) => (
                <LeaderboardRow
                  key={song.id}
                  song={song}
                  rank={rank}
                  voteCount={voteCounts.get(song.id) ?? 0}
                  expanded={expandedId === song.id}
                  onToggle={() => togglePlayer(song.id)}
                  onPlay={() => pauseOthers(song.id)}
                  registerAudio={registerAudio}
                />
              ))}
            </tbody>
          </table>
          </div>
        </div>
          )}
        </>
      )}

      <HallOfFame weeks={hallOfFame} />
    </div>
  )
}

function LeaderboardRow({
  song,
  rank,
  voteCount,
  expanded,
  onToggle,
  onPlay,
  registerAudio,
}: {
  song: Song
  rank: number
  voteCount: number
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
        <td className="px-2 py-3 sm:px-6 sm:py-4">
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold sm:h-8 sm:w-8 sm:text-sm ${
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
        <td className="max-w-[10rem] px-2 py-3 sm:max-w-none sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {song.coverUrl ? (
              <img
                src={song.coverUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-lg object-cover sm:h-10 sm:w-10"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-xs text-neutral-500 sm:h-10 sm:w-10">
                ♪
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-medium text-neutral-100">{song.title}</div>
              <div className="truncate text-xs text-neutral-500 sm:hidden">{song.artist}</div>
            </div>
          </div>
        </td>
        <td className="hidden px-6 py-4 text-neutral-400 sm:table-cell">{song.artist}</td>
        <td className="w-11 px-1 py-3 text-center sm:w-auto sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? `${song.title} ausblenden` : `${song.title} anhören`}
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${
              expanded
                ? 'bg-lime-400 text-neutral-950'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-lime-400'
            }`}
          >
            <Headphones className="h-4 w-4" />
          </button>
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-right font-mono text-sm text-neutral-300 sm:px-6 sm:py-4 sm:text-base">
          {voteCount}
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-right font-mono text-sm font-semibold text-lime-400 sm:px-6 sm:py-4 sm:text-base">
          {song.eloRating}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-neutral-800/60 bg-neutral-800/10">
          <td colSpan={6} className="px-2 py-3 sm:px-6 sm:py-4">
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
