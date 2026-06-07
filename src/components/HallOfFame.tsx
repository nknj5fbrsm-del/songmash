import { useMemo, useRef, useState } from 'react'
import { Crown, Music2, Pause, Play, TrendingUp } from 'lucide-react'
import { useSongs } from '../context/SongContext'
import { getPlayableAudioUrl } from '../lib/audioProxy'
import type { HallOfFameWeek, WeekWinner } from '../types/weekCompetition'
import type { Song } from '../types/song'
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
  song,
  playKey,
  isPlaying,
  onTogglePlay,
  registerAudio,
  onPlaybackEnd,
}: {
  winner: WeekWinner
  label: string
  icon: typeof Crown
  coverUrl?: string
  song?: Song
  playKey: string
  isPlaying: boolean
  onTogglePlay: (key: string, audio: HTMLAudioElement) => void
  registerAudio: (key: string, el: HTMLAudioElement | null) => void
  onPlaybackEnd: (key: string) => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const isChampion = winner.winnerType === 'leaderboard_champion'
  const canPlay = Boolean(song?.audioUrl)
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

        {canPlay && (
          <button
            type="button"
            onClick={() => {
              const audio = audioRef.current
              if (audio) onTogglePlay(playKey, audio)
            }}
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20 transition-colors hover:bg-black/35"
            aria-label={
              isPlaying
                ? `${winner.songTitle} pausieren`
                : `${winner.songTitle} abspielen`
            }
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white/75 ring-1 ring-white/25 backdrop-blur-[2px] transition-colors hover:bg-black/45 hover:text-white/90">
              {isPlaying ? (
                <Pause className="h-5 w-5" aria-hidden />
              ) : (
                <Play className="ml-0.5 h-5 w-5" aria-hidden />
              )}
            </span>
          </button>
        )}

        <span
          className="pointer-events-none absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border border-lime-400/40 bg-neutral-950 shadow-lg shadow-lime-400/25"
          aria-hidden
        >
          {isChampion ? (
            <Crown className="h-5 w-5 text-lime-400" />
          ) : (
            <TrendingUp className="h-5 w-5 text-lime-400" />
          )}
        </span>

        {canPlay && (
          <audio
            ref={(el) => {
              audioRef.current = el
              registerAudio(playKey, el)
            }}
            src={getPlayableAudioUrl(song!.audioUrl)}
            preload="metadata"
            className="hidden"
            onEnded={() => onPlaybackEnd(playKey)}
          />
        )}
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
  const songById = useMemo(() => new Map(songs.map((s) => [s.id, s] as const)), [songs])
  const coverById = useMemo(
    () => new Map(songs.map((s) => [s.id, s.coverUrl] as const)),
    [songs],
  )

  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  const registerAudio = (key: string, el: HTMLAudioElement | null) => {
    if (el) audioRefs.current.set(key, el)
    else audioRefs.current.delete(key)
  }

  const togglePlay = async (key: string, audio: HTMLAudioElement) => {
    if (playingKey === key && !audio.paused) {
      audio.pause()
      setPlayingKey(null)
      return
    }

    audioRefs.current.forEach((other, otherKey) => {
      if (otherKey !== key) other.pause()
    })

    try {
      await audio.play()
      setPlayingKey(key)
    } catch {
      setPlayingKey(null)
    }
  }

  const handlePlaybackEnd = (key: string) => {
    setPlayingKey((current) => (current === key ? null : current))
  }

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
                  song={champion.songId ? songById.get(champion.songId) : undefined}
                  playKey={`${week.id}-leaderboard_champion`}
                  isPlaying={playingKey === `${week.id}-leaderboard_champion`}
                  onTogglePlay={togglePlay}
                  registerAudio={registerAudio}
                  onPlaybackEnd={handlePlaybackEnd}
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
                  song={mvp.songId ? songById.get(mvp.songId) : undefined}
                  playKey={`${week.id}-weekly_mvp`}
                  isPlaying={playingKey === `${week.id}-weekly_mvp`}
                  onTogglePlay={togglePlay}
                  registerAudio={registerAudio}
                  onPlaybackEnd={handlePlaybackEnd}
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
