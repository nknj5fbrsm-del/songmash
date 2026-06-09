import { useRef } from 'react'
import { Music2, ThumbsUp } from 'lucide-react'
import { getPlayableAudioUrl } from '../lib/audioProxy'
import type { Song } from '../types/song'
import { ReportContentButton } from './ReportContentButton'

interface SongCardProps {
  song: Song
  side: 'A' | 'B'
  onVote: () => void
  onPlay: () => void
  voteDisabled?: boolean
  audioRef?: React.RefObject<HTMLAudioElement | null>
}

export function SongCard({ song, side, onVote, onPlay, voteDisabled, audioRef }: SongCardProps) {
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
        <p className="mb-4 text-sm leading-relaxed break-words text-neutral-400">
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

      <div className="mb-4 rounded-xl bg-neutral-800/50 p-3">
        <audio
          ref={ref}
          src={getPlayableAudioUrl(song.audioUrl)}
          controls
          controlsList="nodownload"
          preload="metadata"
          className="w-full"
          onPlay={onPlay}
        />
      </div>

      <div className="mb-4 flex justify-end">
        <ReportContentButton song={song} context="match" />
      </div>

      <div className="mt-auto">
        <button
          type="button"
          onClick={onVote}
          disabled={voteDisabled}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsUp className="h-5 w-5" />
          Vote
        </button>
      </div>
    </div>
  )
}
