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

function WinnerRow({
  winner,
  label,
  icon: Icon,
  coverUrl,
  side,
}: {
  winner: WeekWinner
  label: string
  icon: typeof Crown
  coverUrl?: string
  side: 'left' | 'right'
}) {
  const cover = coverUrl ? (
    <img
      src={coverUrl}
      alt=""
      className="h-8 w-8 shrink-0 rounded-md object-cover ring-1 ring-neutral-800"
    />
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-800/80 ring-1 ring-neutral-800">
      <Music2 className="h-3.5 w-3.5 text-neutral-600" aria-hidden />
    </div>
  )

  const detail =
    winner.winnerType === 'weekly_mvp' && winner.eloDelta != null
      ? `+${winner.eloDelta} Elo`
      : winner.finalElo != null
        ? `${winner.finalElo} Elo`
        : null

  const text = (
    <div className={`min-w-0 flex-1 ${side === 'left' ? 'text-right' : 'text-left'}`}>
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500">
        {side === 'left' ? (
          <>
            <span>{label}</span>
            <Icon className="h-3 w-3 shrink-0 text-lime-400/60" aria-hidden />
          </>
        ) : (
          <>
            <Icon className="h-3 w-3 shrink-0 text-lime-400/60" aria-hidden />
            <span>{label}</span>
          </>
        )}
      </p>
      <p className="truncate text-sm text-neutral-200">{winner.songTitle}</p>
      <p className="truncate text-xs text-neutral-500">{winner.songArtist}</p>
      {detail && <p className="text-[11px] text-neutral-600">{detail}</p>}
    </div>
  )

  return (
    <div
      className={`flex items-center gap-2 ${
        side === 'left' ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {text}
      {cover}
    </div>
  )
}

interface HallOfFameProps {
  weeks: HallOfFameWeek[]
}

export function HallOfFame({ weeks }: HallOfFameProps) {
  const { songs } = useSongs()
  const coverById = useMemo(
    () => new Map(songs.map((s) => [s.id, s.coverUrl] as const)),
    [songs],
  )

  if (weeks.length === 0) return null

  return (
    <section className="mt-10 border-t border-neutral-800/80 pt-8">
      <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Hall of Fame
      </h2>

      <ul className="mx-auto mt-5 flex max-w-3xl flex-col gap-3">
        {weeks.map(({ week, winners }) => {
          const champion = winnerByType(winners, 'leaderboard_champion')
          const mvp = winnerByType(winners, 'weekly_mvp')
          const kw = getBerlinWeekNumber(new Date(week.startsAt))

          return (
            <li
              key={week.id}
              className="rounded-xl border border-neutral-800/60 bg-neutral-900/40 px-3 py-3 sm:px-4"
            >
              <p className="mb-2 text-center text-[11px] text-neutral-600">
                KW {kw} · {formatWeekRange(week.startsAt, week.endsAt)}
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                {champion ? (
                  <WinnerRow
                    winner={champion}
                    label="Song der Woche"
                    icon={Crown}
                    coverUrl={champion.songId ? coverById.get(champion.songId) : undefined}
                    side="left"
                  />
                ) : (
                  <p className="text-center text-xs text-neutral-600 sm:text-right">—</p>
                )}

                {mvp ? (
                  <WinnerRow
                    winner={mvp}
                    label="Aufsteiger der Woche"
                    icon={TrendingUp}
                    coverUrl={mvp.songId ? coverById.get(mvp.songId) : undefined}
                    side="right"
                  />
                ) : (
                  <p className="text-center text-xs text-neutral-600 sm:text-left">—</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
