import { useMemo, useRef, useState } from 'react'
import { Crown, Headphones, Info, Search, TrendingUp, Trophy } from 'lucide-react'
import {
  LeaderboardShufflePlayer,
  type LeaderboardShufflePlayerHandle,
} from './LeaderboardShufflePlayer'
import { useSongs } from '../context/SongContext'
import { useWeekCompetitionContext } from '../context/WeekCompetitionContext'
import { getBerlinWeekNumber } from '../lib/competitionWeek'
import { getPlayableAudioUrl } from '../lib/audioProxy'
import type { Song } from '../types/song'
import type { HallOfFameWeek } from '../types/weekCompetition'
import { EloInfoModal } from './EloInfoModal'
import { WeekCompetitionStrip } from './WeekCompetitionStrip'
import {
  formatScorePercent,
  formatWinLossTooltip,
  getWinLossStats,
  type WinLossStats,
} from '../lib/winLossScore'

type LatestWeekWinners = {
  weekNumber: number
  championId: string | null
  mvpId: string | null
}

function getLatestFinalizedWinners(hallOfFame: HallOfFameWeek[]): LatestWeekWinners | null {
  const latest = hallOfFame[0]
  if (!latest) return null

  const champion = latest.winners.find((w) => w.winnerType === 'leaderboard_champion')
  const mvp = latest.winners.find((w) => w.winnerType === 'weekly_mvp')

  if (!champion?.songId && !mvp?.songId) return null

  return {
    weekNumber: getBerlinWeekNumber(new Date(latest.week.startsAt)),
    championId: champion?.songId ?? null,
    mvpId: mvp?.songId ?? null,
  }
}

export function LeaderboardPage() {
  return <LeaderboardPageContent />
}

function LeaderboardPageContent() {
  const { songs, voteCounts, winLossBySongId, totalVoteRounds } = useSongs()
  const { hallOfFame } = useWeekCompetitionContext()
  const [query, setQuery] = useState('')
  const [eloInfoOpen, setEloInfoOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const shuffleRef = useRef<LeaderboardShufflePlayerHandle>(null)

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

  const latestWinners = useMemo(() => getLatestFinalizedWinners(hallOfFame), [hallOfFame])

  const winnerSongIds = useMemo(() => {
    if (!latestWinners) return new Set<string>()
    return new Set(
      [latestWinners.championId, latestWinners.mvpId].filter((id): id is string => Boolean(id)),
    )
  }, [latestWinners])

  const stopRowPlayers = () => {
    audioRefs.current.forEach((audio) => audio.pause())
    setExpandedId(null)
  }

  const togglePlayer = (songId: string) => {
    shuffleRef.current?.stop()
    setExpandedId((current) => (current === songId ? null : songId))
  }

  const pauseOthers = (songId: string) => {
    shuffleRef.current?.stop()
    audioRefs.current.forEach((audio, id) => {
      if (id !== songId) audio.pause()
    })
  }

  const shuffleSongs = useMemo(() => filtered.map(({ song }) => song), [filtered])

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
        <button
          type="button"
          onClick={() => setEloInfoOpen(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
        >
          <Info className="h-4 w-4 shrink-0 text-lime-400/80" aria-hidden />
          Was bedeuten Elo &amp; Score?
        </button>
        <p className="mt-2 text-sm text-neutral-500">
          Duelle auf SongMash gesamt:{' '}
          <span className="tabular-nums text-neutral-400">{totalVoteRounds.toLocaleString('de-DE')}</span>
        </p>
        <WeekCompetitionStrip className="mt-5" />
      </header>

      {ranked.length === 0 ? (
        <p className="text-center text-neutral-500">Noch keine Songs vorhanden.</p>
      ) : (
        <div className="w-full overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80">
          <div className="leaderboard-toolbar flex flex-col gap-2 border-b border-neutral-800 px-3 py-3 sm:flex-row sm:items-stretch sm:gap-3 sm:px-4">
            <LeaderboardShufflePlayer
              ref={shuffleRef}
              songs={shuffleSongs}
              onActivate={stopRowPlayers}
            />

            <div className="relative min-w-0 sm:w-52 sm:shrink-0 md:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suchen…"
                className="input-field !h-11 !w-full !rounded-xl !border-neutral-800 !bg-neutral-900/60 !py-0 !pl-9 !pr-12 !text-sm"
              />
              {query.trim() && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums text-neutral-500">
                  {filtered.length}/{ranked.length}
                </span>
              )}
            </div>
          </div>

          {latestWinners && winnerSongIds.size > 0 && (
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-neutral-800/60 px-3 py-2 text-center text-xs text-neutral-500 sm:px-4">
              <span className="inline-flex items-center gap-1">
                <Crown className="h-3 w-3 text-lime-400" aria-hidden />
                Song der Woche (KW {latestWinners.weekNumber})
              </span>
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-lime-400/80" aria-hidden />
                Aufsteiger der Woche
              </span>
            </p>
          )}

          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-neutral-500">
              Keine Treffer für „{query.trim()}“.
            </p>
          ) : (
            <>
              <div
                className="leaderboard-grid hidden border-b border-neutral-800 bg-neutral-900 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 sm:grid sm:px-4 lg:text-xs"
                aria-hidden
              >
                <span className="text-center">#</span>
                <span />
                <span>Titel</span>
                <span className="text-right" title="Match-Teilnahmen">
                  Votes
                </span>
                <span className="text-right" title="Siegquote">
                  Score
                </span>
                <span className="text-right">Elo</span>
                <span className="sr-only">Anhören</span>
              </div>

              <ul>
                {filtered.map(({ song, rank }) => (
                  <LeaderboardRow
                    key={song.id}
                    song={song}
                    rank={rank}
                    voteCount={voteCounts.get(song.id) ?? 0}
                    winLoss={getWinLossStats(winLossBySongId, song.id)}
                    expanded={expandedId === song.id}
                    isWeekChampion={latestWinners?.championId === song.id}
                    isWeekMvp={latestWinners?.mvpId === song.id}
                    weekNumber={latestWinners?.weekNumber}
                    onToggle={() => togglePlayer(song.id)}
                    onPlay={() => pauseOthers(song.id)}
                    registerAudio={registerAudio}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <EloInfoModal open={eloInfoOpen} onClose={() => setEloInfoOpen(false)} />
    </div>
  )
}

function LeaderboardRow({
  song,
  rank,
  voteCount,
  winLoss,
  expanded,
  isWeekChampion,
  isWeekMvp,
  weekNumber,
  onToggle,
  onPlay,
  registerAudio,
}: {
  song: Song
  rank: number
  voteCount: number
  winLoss: WinLossStats
  expanded: boolean
  isWeekChampion?: boolean
  isWeekMvp?: boolean
  weekNumber?: number
  onToggle: () => void
  onPlay: () => void
  registerAudio: (songId: string, el: HTMLAudioElement | null) => void
}) {
  const kwLabel = weekNumber != null ? `KW ${weekNumber}` : 'letzte Woche'
  const isWeekWinner = isWeekChampion || isWeekMvp
  const winnerCoverGlow =
    'ring-2 ring-lime-300/80 shadow-[0_0_14px_rgba(190,242,100,0.5)]'

  return (
    <li
      className={`border-b border-neutral-800/60 transition-colors hover:bg-neutral-800/30 ${
        rank <= 3 ? 'bg-lime-400/[0.03]' : ''
      } ${expanded ? 'bg-neutral-800/20' : ''}`}
    >
      <div className="leaderboard-grid items-center px-3 py-2.5 sm:px-4 sm:py-3">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center justify-self-center rounded-lg font-mono text-xs font-bold sm:h-8 sm:w-8 ${
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

        {song.coverUrl ? (
          <img
            src={song.coverUrl}
            alt=""
            className={`h-8 w-8 rounded-lg object-cover sm:h-9 sm:w-9 ${
              isWeekWinner ? winnerCoverGlow : ''
            }`}
          />
        ) : (
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-xs text-neutral-500 sm:h-9 sm:w-9 ${
              isWeekWinner ? winnerCoverGlow : ''
            }`}
          >
            ♪
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-start gap-1.5">
            {(isWeekChampion || isWeekMvp) && (
              <div className="mt-0.5 flex shrink-0 gap-0.5">
                {isWeekChampion && (
                  <span title={`Song der Woche (${kwLabel})`}>
                    <Crown
                      className="h-3.5 w-3.5 text-lime-300 drop-shadow-[0_0_6px_rgba(190,242,100,0.7)]"
                      aria-label={`Song der Woche ${kwLabel}`}
                    />
                  </span>
                )}
                {isWeekMvp && (
                  <span title={`Aufsteiger der Woche (${kwLabel})`}>
                    <TrendingUp
                      className="h-3.5 w-3.5 text-lime-300 drop-shadow-[0_0_6px_rgba(190,242,100,0.6)]"
                      aria-label={`Aufsteiger der Woche ${kwLabel}`}
                    />
                  </span>
                )}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-neutral-100">{song.title}</div>
              <div className="truncate text-xs text-neutral-500">{song.artist}</div>
            </div>
          </div>
        </div>

        <span
          className="text-right font-mono text-xs tabular-nums text-neutral-400 sm:text-sm"
          title="Match-Teilnahmen"
        >
          {voteCount}
        </span>
        <span
          className="text-right font-mono text-xs tabular-nums text-neutral-200 sm:text-sm"
          title={formatWinLossTooltip(winLoss.wins, winLoss.losses)}
        >
          {formatScorePercent(winLoss.score)}
        </span>
        <span className="text-right font-mono text-xs font-semibold tabular-nums text-lime-400 sm:text-sm">
          {song.eloRating}
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? `${song.title} ausblenden` : `${song.title} anhören`}
          className={`inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-lg transition-colors sm:h-9 sm:w-9 ${
            expanded
              ? 'bg-lime-400 text-neutral-950'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-lime-400'
          }`}
        >
          <Headphones className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-neutral-800/40 bg-neutral-800/10 px-3 py-3 md:px-4 md:py-4">
          <div className="mx-auto max-w-xl rounded-xl bg-neutral-800/50 p-3">
            <audio
              ref={(el) => registerAudio(song.id, el)}
              src={getPlayableAudioUrl(song.audioUrl)}
              controls
              controlsList="nodownload"
              autoPlay
              preload="metadata"
              className="w-full"
              onPlay={onPlay}
            />
          </div>
        </div>
      )}
    </li>
  )
}
