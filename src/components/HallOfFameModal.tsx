import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import confetti from 'canvas-confetti'
import { Crown, X } from 'lucide-react'
import type { HallOfFameWeek } from '../types/weekCompetition'
import { HallOfFameList } from './HallOfFame'

const CONFETTI_COLORS = ['#a3e635', '#bef264', '#fde047', '#fafafa', '#d9f99d']

function fireModalConfetti(canvas: HTMLCanvasElement): (() => void) | void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const fire = confetti.create(canvas, { resize: true, useWorker: true })
  const burst = (x: number, y: number, spread: number, velocity: number, count: number) => {
    fire({
      particleCount: count,
      spread,
      startVelocity: velocity,
      origin: { x, y },
      colors: CONFETTI_COLORS,
      ticks: 140,
      gravity: 0.9,
      scalar: 0.9,
    })
  }

  burst(0.32, 0.22, 62, 28, 55)
  const t1 = window.setTimeout(() => burst(0.68, 0.22, 62, 28, 55), 160)
  const t2 = window.setTimeout(() => burst(0.5, 0.14, 90, 32, 40), 320)

  return () => {
    window.clearTimeout(t1)
    window.clearTimeout(t2)
    fire.reset()
  }
}

interface HallOfFameModalProps {
  open: boolean
  onClose: () => void
  weeks: HallOfFameWeek[]
}

export function HallOfFameModal({ open, onClose, weeks }: HallOfFameModalProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    closeRef.current?.focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)

    const scrollY = window.scrollY
    const { style } = document.body
    const prev = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      overflow: style.overflow,
      width: style.width,
    }
    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.left = '0'
    style.right = '0'
    style.width = '100%'
    style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      style.position = prev.position
      style.top = prev.top
      style.left = prev.left
      style.right = prev.right
      style.overflow = prev.overflow
      style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const canvas = confettiCanvasRef.current
    const dialog = dialogRef.current
    if (!canvas || !dialog) return

    const syncCanvasSize = () => {
      const { width, height } = dialog.getBoundingClientRect()
      canvas.width = width
      canvas.height = height
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }

    syncCanvasSize()
    const cleanupConfetti = fireModalConfetti(canvas)

    const observer = new ResizeObserver(syncCanvasSize)
    observer.observe(dialog)

    return () => {
      observer.disconnect()
      cleanupConfetti?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92dvh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-neutral-800 bg-neutral-900/80 shadow-2xl shadow-black/50 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <canvas
          ref={confettiCanvasRef}
          className="pointer-events-none absolute inset-0 z-20"
          aria-hidden
        />

        <div className="relative z-30 flex shrink-0 items-start justify-between gap-4 border-b border-neutral-800/80 bg-neutral-900/95 px-5 py-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 shrink-0 text-lime-400" aria-hidden />
            <h2 id={titleId} className="text-xl font-bold text-neutral-50">
              Hall of Fame
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn-secondary shrink-0 px-3 py-2"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 sm:px-6">
          <p className="mb-5 text-sm leading-relaxed text-neutral-400">
            Die gekürten Songs vergangener Wochen — verdient gefeiert.
          </p>

          <HallOfFameList weeks={weeks} />

          <button type="button" onClick={onClose} className="btn-primary mt-6 w-full">
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
