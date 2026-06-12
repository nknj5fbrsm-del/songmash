import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Mic, X } from 'lucide-react'
import { ForumApiError } from '../../lib/forumApi'
import {
  uploadForumAttachment,
  validateForumAudioFile,
  validateForumImageFile,
} from '../../lib/forumUploadApi'
import type { ForumPendingAttachments } from '../../types/forum'

interface ForumAttachmentPickerProps {
  attachments: ForumPendingAttachments
  onChange: (next: ForumPendingAttachments) => void
  disabled?: boolean
}

export function ForumAttachmentPicker({
  attachments,
  onChange,
  disabled,
}: ForumAttachmentPickerProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loadingKind, setLoadingKind] = useState<'image' | 'audio' | null>(null)

  const handleFile = async (file: File, kind: 'image' | 'audio') => {
    setError('')
    const validation = kind === 'image' ? validateForumImageFile(file) : validateForumAudioFile(file)
    if (validation) {
      setError(validation)
      return
    }

    setLoadingKind(kind)
    try {
      const publicUrl = await uploadForumAttachment(file, kind)
      onChange({
        ...attachments,
        ...(kind === 'image' ? { imageUrl: publicUrl } : { audioUrl: publicUrl }),
      })
    } catch (err) {
      setError(err instanceof ForumApiError ? err.message : 'Upload fehlgeschlagen.')
    } finally {
      setLoadingKind(null)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/30 p-3">
      <p className="text-xs text-neutral-500">
        Datei anhängen (optional, getrennt von SongMash) — max. 3 Uploads pro Stunde.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || loadingKind !== null || !!attachments.imageUrl}
          onClick={() => imageInputRef.current?.click()}
          className="btn-secondary !py-2 text-sm"
        >
          {loadingKind === 'image' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          Bild
        </button>
        <button
          type="button"
          disabled={disabled || loadingKind !== null || !!attachments.audioUrl}
          onClick={() => audioInputRef.current?.click()}
          className="btn-secondary !py-2 text-sm"
        >
          {loadingKind === 'audio' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          Audio
        </button>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file, 'image')
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.wav,.m4a,.ogg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file, 'audio')
        }}
      />

      {attachments.imageUrl && (
        <div className="relative overflow-hidden rounded-lg border border-neutral-800">
          <img
            src={attachments.imageUrl}
            alt="Angehängtes Bild"
            className="max-h-48 w-full object-contain bg-neutral-950"
          />
          <button
            type="button"
            onClick={() => onChange({ ...attachments, imageUrl: undefined })}
            className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-neutral-300 hover:text-white"
            aria-label="Bild entfernen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {attachments.audioUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 p-2">
          <audio
            src={attachments.audioUrl}
            controls
            controlsList="nodownload"
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => onChange({ ...attachments, audioUrl: undefined })}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
            aria-label="Audio entfernen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && <p className="alert-error text-xs">{error}</p>}
    </div>
  )
}
