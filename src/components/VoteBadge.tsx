import { useEffect, useRef, useState } from 'react'
import { BadgeSleepingIcon } from './CrossedSwordsSvg'
import badgeTier50 from '../assets/badges/badge-tier-50.png'
import badgeTier100 from '../assets/badges/badge-tier-100.png'
import {
  BADGE_TIER_1,
  BADGE_TIER_2,
  getBadgeTier,
} from '../lib/userVoteProgress'

const SIZE = 96
/** Freigeschaltete Embleme etwas größer — PNG-Glow darf nicht am Container abgeschnitten werden. */
const TIER_EMBLEM_SIZE = 112
const STROKE = 4
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CENTER = SIZE / 2

const TIER_EMBLEM: Record<1 | 2, { src: string; alt: string }> = {
  1: { src: badgeTier50, alt: 'Duell-Kämpfer — 50 Votes erreicht' },
  2: { src: badgeTier100, alt: 'Duell-Meister — 100 Votes erreicht' },
}

function ringProgress(count: number, tier: ReturnType<typeof getBadgeTier>): number {
  if (tier !== 0) return 1
  return Math.min(1, count / BADGE_TIER_1)
}

function progressLabel(count: number, tier: ReturnType<typeof getBadgeTier>): string {
  if (tier === 0) return `${count} / ${BADGE_TIER_1} Votes`
  if (tier === 1) return `${count} / ${BADGE_TIER_2} Votes`
  return `${BADGE_TIER_2} Votes`
}

interface VoteBadgeProps {
  count: number
}

export function VoteBadge({ count }: VoteBadgeProps) {
  const tier = getBadgeTier(count)
  const progress = ringProgress(count, tier)
  const offset = CIRCUMFERENCE * (1 - progress)
  const prevCount = useRef(count)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const crossed50 = prevCount.current < BADGE_TIER_1 && count >= BADGE_TIER_1
    const crossed100 = prevCount.current < BADGE_TIER_2 && count >= BADGE_TIER_2
    prevCount.current = count

    if (crossed50 || crossed100) {
      setFlash(true)
      const t = window.setTimeout(() => setFlash(false), 900)
      return () => window.clearTimeout(t)
    }
  }, [count])

  const progressStroke = '#a855f7'
  const progressFilter = 'drop-shadow(0 0 6px rgba(168,85,247,0.5))'

  const tierEmblem = tier >= 1 ? TIER_EMBLEM[tier as 1 | 2] : null

  return (
    <div className="flex flex-col items-center" title={progressLabel(count, tier)}>
      <div
        className={`relative ${flash ? 'scale-105 transition-transform duration-300' : ''} ${
          tier === 2 ? 'animate-pulse' : ''
        }`}
      >
        {tier === 0 ? (
          <>
            <svg
              width={SIZE}
              height={SIZE}
              className="-rotate-90"
              aria-hidden
            >
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE}
                className="text-neutral-800"
              />
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={progressStroke}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                className="transition-all duration-500 ease-out"
                style={{ filter: progressFilter }}
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <BadgeSleepingIcon className="h-11 w-11" />
            </div>
          </>
        ) : (
          <img
            src={tierEmblem!.src}
            alt={tierEmblem!.alt}
            width={TIER_EMBLEM_SIZE}
            height={TIER_EMBLEM_SIZE}
            className="block object-contain"
            style={{ width: TIER_EMBLEM_SIZE, height: TIER_EMBLEM_SIZE }}
            draggable={false}
          />
        )}
      </div>

      <p className="mt-2 text-center text-[11px] tracking-wide text-neutral-500">
        {progressLabel(count, tier)}
      </p>
      {tier >= 1 && (
        <p className="text-[10px] font-medium text-neutral-600">
          {tier === 2 ? 'Duell-Meister' : 'Duell-Kämpfer'}
        </p>
      )}
    </div>
  )
}
