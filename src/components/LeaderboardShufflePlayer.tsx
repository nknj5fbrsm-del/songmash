import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Pause, Play, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import { getPlayableAudioUrl } from '../lib/audioProxy'
import type { Song } from '../types/song'

export type LeaderboardShufflePlayerHandle = {
  stop: () => void
}

interface LeaderboardShufflePlayerProps {
  songs: Song[]
  onActivate?: () => void
}

const controlBtnClass =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-neutral-800 disabled:hover:text-neutral-300'

function pickRandomSong(songs: Song[], excludeId?: string): Song | null {
  if (songs.length === 0) return null
  const pool =
    excludeId && songs.length > 1 ? songs.filter((s) => s.id !== excludeId) : songs
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

export const LeaderboardShufflePlayer = forwardRef<
  LeaderboardShufflePlayerHandle,
  LeaderboardShufflePlayerProps
>(function LeaderboardShufflePlayer({ songs, onActivate }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const currentIdRef = useRef<string | null>(null)
  const scrubbingRef = useRef(false)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const skipHistoryPushRef = useRef(false)

  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [canGoBack, setCanGoBack] = useState(false)

  const syncHistoryNav = useCallback(() => {
    setCanGoBack(historyIndexRef.current > 0)
  }, [])

  const resetHistory = useCallback(() => {
    historyRef.current = []
    historyIndexRef.current = -1
    syncHistoryNav()
  }, [syncHistoryNav])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    currentIdRef.current = null
    setCurrentSong(null)
    setPlaying(false)
    setProgress(0)
    resetHistory()
  }, [resetHistory])

  useImperativeHandle(ref, () => ({ stop }), [stop])

  const loadSong = useCallback(
    async (song: Song, autoplay: boolean) => {
      const audio = audioRef.current
      if (!audio) return

      currentIdRef.current = song.id
      setCurrentSong(song)
      setProgress(0)
      audio.src = getPlayableAudioUrl(song.audioUrl)
      audio.load()

      if (!skipHistoryPushRef.current) {
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
        historyRef.current.push(song.id)
        historyIndexRef.current = historyRef.current.length - 1
        syncHistoryNav()
      } else {
        skipHistoryPushRef.current = false
      }

      if (autoplay) {
        try {
          await audio.play()
          setPlaying(true)
        } catch {
          setPlaying(false)
        }
      }
    },
    [syncHistoryNav],
  )

  const playRandom = useCallback(
    (excludeCurrent = false) => {
      if (songs.length === 0) return
      onActivate?.()
      const next = pickRandomSong(
        songs,
        excludeCurrent ? (currentIdRef.current ?? undefined) : undefined,
      )
      if (!next) return
      void loadSong(next, true)
    },
    [songs, onActivate, loadSong],
  )

  const playFromHistory = useCallback(
    (index: number) => {
      const id = historyRef.current[index]
      const song = songs.find((s) => s.id === id)
      if (!song) return

      onActivate?.()
      historyIndexRef.current = index
      syncHistoryNav()
      skipHistoryPushRef.current = true
      void loadSong(song, true)
    },
    [songs, onActivate, loadSong, syncHistoryNav],
  )

  const playPrevious = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    playFromHistory(historyIndexRef.current - 1)
  }, [playFromHistory])

  const playNext = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      playFromHistory(historyIndexRef.current + 1)
      return
    }
    playRandom(true)
  }, [playFromHistory, playRandom])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!currentSong) {
      playRandom(false)
      return
    }

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [currentSong, playing, playRandom])

  const seekToClientX = useCallback((clientX: number) => {
    const audio = audioRef.current
    const bar = barRef.current
    if (!audio || !bar || !Number.isFinite(audio.duration) || audio.duration <= 0) return

    const rect = bar.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    audio.currentTime = fraction * audio.duration
    setProgress(fraction * 100)
  }, [])

  useEffect(() => {
    if (!playing && !currentSong) return

    const onMove = (e: PointerEvent) => {
      if (!scrubbingRef.current) return
      seekToClientX(e.clientX)
    }

    const onUp = () => {
      scrubbingRef.current = false
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [playing, currentSong, seekToClientX])

  useEffect(() => {
    stop()
  }, [songs, stop])

  const disabled = songs.length === 0

  return (
    <div
      className={`flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 px-2.5 py-2 sm:flex-nowrap sm:gap-2.5 sm:px-3 sm:py-0 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={playPrevious}
          disabled={disabled || !canGoBack}
          className={controlBtnClass}
          aria-label="Vorheriger Song"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          disabled={disabled}
          className={`${controlBtnClass} !text-lime-400 hover:!text-lime-300`}
          aria-label={playing ? 'Zufallswiedergabe pausieren' : 'Zufallswiedergabe starten'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={playNext}
          disabled={disabled || songs.length === 0}
          className={controlBtnClass}
          aria-label="Nächster Song"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Shuffle className="h-3.5 w-3.5 shrink-0 text-neutral-600" aria-hidden />
        <p className="truncate text-sm text-neutral-300">
          {currentSong ? (
            <>
              <span className="font-medium text-neutral-100">{currentSong.title}</span>
              <span className="text-neutral-600"> · </span>
              <span className="text-neutral-500">{currentSong.artist}</span>
            </>
          ) : (
            <span className="text-neutral-500">Zufall aus Liste</span>
          )}
        </p>
      </div>

      <div
        ref={barRef}
        role="slider"
        aria-label="Wiedergabeposition"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-disabled={disabled || !currentSong}
        className="flex h-5 w-full shrink-0 cursor-pointer touch-none items-center py-1 sm:h-11 sm:w-28 sm:py-2 md:w-36 lg:w-44"
        onPointerDown={(e) => {
          if (disabled || !currentSong) return
          scrubbingRef.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          seekToClientX(e.clientX)
        }}
      >
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-lime-400/80 transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => playRandom(true)}
        onTimeUpdate={() => {
          if (scrubbingRef.current) return
          const audio = audioRef.current
          if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return
          setProgress((audio.currentTime / audio.duration) * 100)
        }}
      />
    </div>
  )
})
