import { useCallback, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Upload } from 'lucide-react'

interface DropZoneProps {
  label: string
  hint: string
  accept: string
  icon?: ReactNode
  preview?: ReactNode
  onFile: (file: File) => void
  disabled?: boolean
}

export function DropZone({
  label,
  hint,
  accept,
  icon,
  preview,
  onFile,
  disabled,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file && !disabled) onFile(file)
    },
    [disabled, onFile],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-neutral-300">{label}</p>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-colors ${
          dragging
            ? 'border-lime-400 bg-lime-400/10'
            : 'border-neutral-700 bg-neutral-900/50 hover:border-lime-400/40 hover:bg-neutral-900'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        {preview ?? (
          <>
            {icon ?? <Upload className="mb-2 h-8 w-8 text-lime-400" />}
            <p className="text-sm font-medium text-neutral-200">{label}</p>
            <p className="mt-1 text-xs text-neutral-500">{hint}</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
