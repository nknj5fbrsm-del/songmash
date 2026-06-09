import type { VoteRecord, VoteResult } from '../types/song'

const SHRINKAGE_WINS = 5
const SHRINKAGE_TOTAL = 10

export type WinLossStats = {
  wins: number
  losses: number
  /** Geglätteter Anteil 0–1: (wins + 5) / (wins + losses + 10) */
  score: number
}

export function smoothedWinLossScore(wins: number, losses: number): number {
  return (wins + SHRINKAGE_WINS) / (wins + losses + SHRINKAGE_TOTAL)
}

export const DEFAULT_WIN_LOSS: WinLossStats = {
  wins: 0,
  losses: 0,
  score: smoothedWinLossScore(0, 0),
}

export function computeWinLossBySongId(votes: VoteRecord[]): Map<string, WinLossStats> {
  const raw = new Map<string, { wins: number; losses: number }>()

  const bump = (songId: string, field: 'wins' | 'losses') => {
    const entry = raw.get(songId) ?? { wins: 0, losses: 0 }
    entry[field]++
    raw.set(songId, entry)
  }

  for (const vote of votes) {
    if (vote.winner === 'skip') continue
    if (vote.winner === 'A') {
      bump(vote.songAId, 'wins')
      bump(vote.songBId, 'losses')
    } else {
      bump(vote.songBId, 'wins')
      bump(vote.songAId, 'losses')
    }
  }

  const result = new Map<string, WinLossStats>()
  for (const [songId, { wins, losses }] of raw) {
    result.set(songId, { wins, losses, score: smoothedWinLossScore(wins, losses) })
  }
  return result
}

export function applyVoteToWinLoss(
  stats: Map<string, WinLossStats>,
  songAId: string,
  songBId: string,
  result: VoteResult,
): Map<string, WinLossStats> {
  if (result === 'skip') return stats

  const next = new Map(stats)
  const winnerId = result === 'A' ? songAId : songBId
  const loserId = result === 'A' ? songBId : songAId

  const bump = (songId: string, field: 'wins' | 'losses') => {
    const current = next.get(songId) ?? { ...DEFAULT_WIN_LOSS }
    const wins = current.wins + (field === 'wins' ? 1 : 0)
    const losses = current.losses + (field === 'losses' ? 1 : 0)
    next.set(songId, { wins, losses, score: smoothedWinLossScore(wins, losses) })
  }

  bump(winnerId, 'wins')
  bump(loserId, 'losses')
  return next
}

export function getWinLossStats(
  stats: Map<string, WinLossStats>,
  songId: string,
): WinLossStats {
  return stats.get(songId) ?? DEFAULT_WIN_LOSS
}

export function formatScorePercent(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function formatWinLossTooltip(wins: number, losses: number): string {
  const winLabel = wins === 1 ? 'Sieg' : 'Siege'
  const lossLabel = losses === 1 ? 'Niederlage' : 'Niederlagen'
  return `${wins} ${winLabel} · ${losses} ${lossLabel}`
}
