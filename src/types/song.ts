export interface Song {
  id: string
  title: string
  artist: string
  audioUrl: string
  sourceUrl?: string
  coverUrl?: string
  description?: string
  eloRating: number
  techStackTags: string[]
  submissionDate: string
}

export interface VoteMatch {
  songA: Song
  songB: Song
}

export type VoteResult = 'A' | 'B' | 'skip'

export interface VoteRecord {
  id: string
  songAId: string
  songBId: string
  winner: VoteResult
  createdAt: string
}
