import { useRef } from 'react'
import { Music2, ThumbsUp } from 'lucide-react'
import { getPlayableAudioUrl } from '../lib/audioProxy'
import type { Song } from '../types/song'

interface SongCardProps {
  song: Song
  side: 'A' | 'B'
  onVote: () => void
  onPlay: () => void
  audioRef?: React.RefObject<HTMLAudioElement | null>
}

export function SongCard({ song, side, onVote, onPlay, audioRef }: SongCardProps) {
  const internalRef = useRef<HTMLAudioElement>(null)
  const ref = audioRef ?? internalRef

  return (
    <div className="card flex flex-1 flex-col transition-colors hover:border-neutral-700">
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-lime-400/80">
        Song {side}
      </div>

      {song.coverUrl ? (
        <img
          src={song.coverUrl}
          alt={`Cover: ${song.title}`}
          className="mx-auto mb-4 aspect-square w-full max-w-[220px] rounded-xl object-cover"
        />
      ) : (
        <div className="mx-auto mb-4 flex aspect-square w-full max-w-[220px] items-center justify-center rounded-xl bg-neutral-800/60">
          <Music2 className="h-12 w-12 text-neutral-600" />
        </div>
      )}

      <h2 className="mb-1 text-2xl font-bold text-neutral-50">{song.title}</h2>
      <p className="mb-2 text-neutral-400">{song.artist}</p>

      {song.description && (
        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-neutral-400">
          {song.description}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {song.techStackTags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="mb-6 rounded-xl bg-neutral-800/50 p-3">
        <audio
          ref={ref}
          src={getPlayableAudioUrl(song.audioUrl)}
          controls
          preload="metadata"
          className="w-full"
          onPlay={onPlay}
        />
      </div>

      <div className="mt-auto">
        <div className="mb-4 text-center text-sm text-neutral-500">
          Elo: <span className="font-mono text-neutral-300">{song.eloRating}</span>
        </div>

        <button type="button" onClick={onVote} className="btn-primary w-full">
          <ThumbsUp className="h-5 w-5" />
          Vote
        </button>
      </div>
    </div>
  )
}
