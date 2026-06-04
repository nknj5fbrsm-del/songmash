export type WeekWinnerType = 'leaderboard_champion' | 'weekly_mvp'

export interface CompetitionWeek {
  id: string
  startsAt: string
  endsAt: string
  status: 'active' | 'finalized'
}

export interface WeekWinner {
  id: string
  weekId: string
  winnerType: WeekWinnerType
  songId: string | null
  songTitle: string
  songArtist: string
  finalElo: number | null
  eloDelta: number | null
  finalRank: number | null
  weekVoteCount: number | null
}

export interface HallOfFameWeek {
  week: CompetitionWeek
  winners: WeekWinner[]
}
