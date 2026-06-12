interface ForumAttachmentDisplayProps {
  imageUrl?: string
  audioUrl?: string
}

export function ForumAttachmentDisplay({ imageUrl, audioUrl }: ForumAttachmentDisplayProps) {
  if (!imageUrl && !audioUrl) return null

  return (
    <div className="mt-3 space-y-3">
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Anhang"
          className="max-h-72 w-full rounded-lg border border-neutral-800 object-contain bg-neutral-950"
          loading="lazy"
        />
      )}
      {audioUrl && (
        <audio
          src={audioUrl}
          controls
          controlsList="nodownload"
          className="w-full"
        />
      )}
    </div>
  )
}
