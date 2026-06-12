import { useMemo, useRef, useState } from 'react'
import { Library, Music2, Pause, Play, Search, X } from 'lucide-react'
import { useSongs } from '../../context/SongContext'
import { getPlayableAudioUrl } from '../../lib/audioProxy'
import type { Song } from '../../types/song'

interface ForumSongLibraryProps {
  selectedSongId?: string | null
  onSelectSong?: (song: Song) => void
  onClose?: () => void
  className?: string
}

export function ForumSongLibrary({
  selectedSongId,
  onSelectSong,
  onClose,
  className,
}: ForumSongLibraryProps) {
  const { songs } = useSongs()
  const [query, setQuery] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return songs
    return songs.filter(
      (s) => s.title.toLowerCase().includes(term) || s.artist.toLowerCase().includes(term),
    )
  }, [songs, query])

  const playSong = (song: Song) => {
    const audio = audioRef.current
    if (!audio) return

    if (playingId === song.id) {
      audio.pause()
      setPlayingId(null)
      return
    }

    audio.src = getPlayableAudioUrl(song.audioUrl)
    void audio.play()
    setPlayingId(song.id)
  }

  return (
    <aside
      className={`flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/80 ${
        className ?? ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 px-3 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
          <Library className="h-4 w-4 text-lime-400" />
          Song-Bibliothek
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
            aria-label="Bibliothek schließen"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="border-b border-neutral-800 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Song suchen…"
            className="input-field !py-2.5 !pl-9 !text-sm"
          />
        </div>
        {onSelectSong && (
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
            Tippe auf einen Song, um ihn in deinen Beitrag einzufügen.
          </p>
        )}
      </div>

      <ul className="scrollbar-dark max-h-[min(50vh,420px)] flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <li className="px-2 py-6 text-center text-sm text-neutral-500">Keine Songs gefunden.</li>
        ) : (
          filtered.map((song) => {
            const selected = selectedSongId === song.id
            const playing = playingId === song.id
            return (
              <li key={song.id} className="mb-1">
                <div
                  className={`flex items-center gap-2 rounded-xl px-2 py-2 ${
                    selected ? 'bg-lime-400/10 ring-1 ring-lime-400/30' : 'hover:bg-neutral-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => playSong(song)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-lime-400 hover:bg-neutral-700"
                    aria-label={playing ? 'Pause' : 'Abspielen'}
                  >
                    {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSong?.(song)}
                    className="min-w-0 flex-1 text-left"
                    disabled={!onSelectSong}
                  >
                    <p className="truncate text-sm font-medium text-neutral-100">{song.title}</p>
                    <p className="truncate text-xs text-neutral-500">{song.artist}</p>
                  </button>
                  {!song.coverUrl && (
                    <Music2 className="h-4 w-4 shrink-0 text-neutral-700" aria-hidden />
                  )}
                </div>
              </li>
            )
          })
        )}
      </ul>

      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => setPlayingId(null)}
        onPause={() => setPlayingId(null)}
      />
    </aside>
  )
}
