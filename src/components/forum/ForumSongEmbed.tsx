import { useRef } from 'react'
import { Music2, Play } from 'lucide-react'
import { getPlayableAudioUrl } from '../../lib/audioProxy'
import type { Song } from '../../types/song'

interface ForumSongEmbedProps {
  song: Song
  onPlay?: () => void
  compact?: boolean
}

export function ForumSongEmbed({ song, onPlay, compact }: ForumSongEmbedProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const playingRef = useRef(false)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playingRef.current) {
      audio.pause()
      playingRef.current = false
    } else {
      onPlay?.()
      void audio.play()
      playingRef.current = true
    }
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-lime-400/20 bg-lime-400/[0.06] ${
        compact ? 'p-2' : 'p-3'
      }`}
    >
      {song.coverUrl ? (
        <img
          src={song.coverUrl}
          alt=""
          className={`shrink-0 rounded-lg object-cover ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}
        />
      ) : (
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg bg-neutral-800 ${
            compact ? 'h-10 w-10' : 'h-12 w-12'
          }`}
        >
          <Music2 className="h-5 w-5 text-neutral-600" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-100">{song.title}</p>
        <p className="truncate text-xs text-neutral-500">{song.artist}</p>
      </div>
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-lime-400 hover:bg-neutral-700"
        aria-label="Song abspielen"
      >
        <Play className="h-4 w-4" />
      </button>
      <audio
        ref={audioRef}
        src={getPlayableAudioUrl(song.audioUrl)}
        preload="metadata"
        className="hidden"
        onEnded={() => {
          playingRef.current = false
        }}
        onPause={() => {
          playingRef.current = false
        }}
      />
    </div>
  )
}
