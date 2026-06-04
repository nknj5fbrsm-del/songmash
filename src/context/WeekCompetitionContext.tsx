import { createContext, useContext, type ReactNode } from 'react'
import { useSongs } from './SongContext'
import { useWeekCompetition } from '../hooks/useWeekCompetition'

type WeekCompetitionValue = ReturnType<typeof useWeekCompetition>

const WeekCompetitionContext = createContext<WeekCompetitionValue | null>(null)

export function WeekCompetitionProvider({ children }: { children: ReactNode }) {
  const { songs, totalVoteRounds } = useSongs()
  const value = useWeekCompetition(songs, totalVoteRounds)
  return (
    <WeekCompetitionContext.Provider value={value}>{children}</WeekCompetitionContext.Provider>
  )
}

export function useWeekCompetitionContext() {
  const ctx = useContext(WeekCompetitionContext)
  if (!ctx) {
    throw new Error('useWeekCompetitionContext must be used within WeekCompetitionProvider')
  }
  return ctx
}
