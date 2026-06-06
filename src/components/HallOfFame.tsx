import { useMemo } from 'react'
import { Crown, Music2, TrendingUp } from 'lucide-react'
import { useSongs } from '../context/SongContext'
import type { HallOfFameWeek, WeekWinner } from '../types/weekCompetition'
import { getBerlinWeekNumber } from '../lib/competitionWeek'

function formatWeekRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const fmt = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
  })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}

function winnerByType(winners: WeekWinner[], type: WeekWinner['winnerType']) {
  return winners.find((w) => w.winnerType === type)
}

function WinnerCard({
  winner,
  label,
  icon: Icon,
  coverUrl,
  variant,
}: {
  winner: WeekWinner
  label: string
  icon: typeof Crown
  coverUrl?: string
  variant: 'champion' | 'mvp'
}) {
  const isChampion = variant === 'champion'
  const statLabel =
    winner.winnerType === 'weekly_mvp' && winner.eloDelta != null
      ? `+${winner.eloDelta} Elo diese Woche`
      : winner.finalElo != null
        ? `${winner.finalElo} Elo`
        : null

  return (
    <article
      className={`flex flex-col items-center rounded-2xl border px-4 py-5 text-center ${
        isChampion
          ? 'border-lime-400/25 bg-gradient-to-b from-lime-400/[0.12] via-lime-400/[0.04] to-neutral-950/50 shadow-[0_0_28px_rgba(163,230,53,0.1)]'
          : 'border-lime-400/15 bg-gradient-to-b from-lime-400/[0.07] to-neutral-950/50 shadow-[0_0_20px_rgba(163,230,53,0.06)]'
      }`}
    >
      <div
        className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
          isChampion
            ? 'border border-lime-400/30 bg-lime-400/15 text-lime-200'
            : 'border border-lime-400/20 bg-lime-400/10 text-lime-300/90'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-lime-400" aria-hidden />
        {label}
      </div>

      <div className="relative mb-4">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className={`h-28 w-28 rounded-2xl object-cover sm:h-32 sm:w-32 ${
              isChampion
                ? 'ring-2 ring-lime-400/50 shadow-lg shadow-lime-400/20'
                : 'ring-2 ring-lime-400/30 shadow-md shadow-lime-400/10'
            }`}
          />
        ) : (
          <div
            className={`flex h-28 w-28 items-center justify-center rounded-2xl bg-neutral-800/90 sm:h-32 sm:w-32 ${
              isChampion
                ? 'ring-2 ring-lime-400/40'
                : 'ring-2 ring-lime-400/25'
            }`}
          >
            <Music2 className="h-10 w-10 text-neutral-600" aria-hidden />
          </div>
        )}
        <span
          className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border border-lime-400/40 bg-neutral-950 shadow-lg shadow-lime-400/25"
          aria-hidden
        >
          {isChampion ? (
            <Crown className="h-5 w-5 text-lime-400" />
          ) : (
            <TrendingUp className="h-5 w-5 text-lime-400" />
          )}
        </span>
      </div>

      <h3 className="max-w-full truncate text-lg font-bold tracking-tight text-neutral-50 sm:text-xl">
        {winner.songTitle}
      </h3>
      <p className="mt-1 max-w-full truncate text-sm text-neutral-400">{winner.songArtist}</p>

      {statLabel && (
        <p className="mt-3 font-mono text-sm font-semibold text-lime-400">{statLabel}</p>
      )}
      {winner.weekVoteCount != null && winner.weekVoteCount > 0 && (
        <p className="mt-1 text-xs text-neutral-500">
          {winner.weekVoteCount} Votes in dieser Woche
        </p>
      )}
    </article>
  )
}

interface HallOfFameListProps {
  weeks: HallOfFameWeek[]
}

export function HallOfFameList({ weeks }: HallOfFameListProps) {
  const { songs } = useSongs()
  const coverById = useMemo(
    () => new Map(songs.map((s) => [s.id, s.coverUrl] as const)),
    [songs],
  )

  if (weeks.length === 0) {
    return (
      <p className="text-center text-sm text-neutral-500">
        Noch keine abgeschlossene Woche.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-5">
      {weeks.map(({ week, winners }) => {
        const champion = winnerByType(winners, 'leaderboard_champion')
        const mvp = winnerByType(winners, 'weekly_mvp')
        const kw = getBerlinWeekNumber(new Date(week.startsAt))

        return (
          <li
            key={week.id}
            className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/30"
          >
            <div className="border-b border-neutral-800/80 bg-neutral-900/50 px-4 py-2.5 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Kalenderwoche {kw}
              </p>
              <p className="text-[11px] text-neutral-600">
                {formatWeekRange(week.startsAt, week.endsAt)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4">
              {champion ? (
                <WinnerCard
                  winner={champion}
                  label="Song der Woche"
                  icon={Crown}
                  coverUrl={champion.songId ? coverById.get(champion.songId) : undefined}
                  variant="champion"
                />
              ) : (
                <p className="flex items-center justify-center py-8 text-sm text-neutral-600">—</p>
              )}

              {mvp ? (
                <WinnerCard
                  winner={mvp}
                  label="Aufsteiger der Woche"
                  icon={TrendingUp}
                  coverUrl={mvp.songId ? coverById.get(mvp.songId) : undefined}
                  variant="mvp"
                />
              ) : (
                <p className="flex items-center justify-center py-8 text-sm text-neutral-600">—</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
