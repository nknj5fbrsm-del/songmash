export interface ForumPinnedThread {
  id: string
  boardId: string
  title: string
  authorName: string
  boardName: string
  categoryName: string
  isLocked: boolean
  updatedAt: string
}

export interface ForumPinnedBoard {
  id: string
  categoryId: string
  name: string
  description?: string
  categoryName: string
  threadCount: number
  latestActivityAt?: string
}

export interface ForumBoardSummary {
  id: string
  categoryId: string
  name: string
  description?: string
  sortOrder: number
  isPinned: boolean
  threadCount: number
  latestActivityAt?: string
}

export interface ForumCategory {
  id: string
  name: string
  description?: string
  sortOrder: number
  boards: ForumBoardSummary[]
}

export interface ForumThreadSummary {
  id: string
  boardId: string
  title: string
  authorName: string
  songId?: string
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
  postCount: number
}

export interface ForumBoardDetail {
  id: string
  categoryId: string
  categoryName: string
  name: string
  description?: string
}

export interface ForumThreadDetail {
  id: string
  boardId: string
  boardName: string
  categoryName: string
  title: string
  authorName: string
  songId?: string
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
}

export interface ForumPost {
  id: string
  threadId: string
  authorName: string
  body: string
  songId?: string
  imageUrl?: string
  audioUrl?: string
  createdAt: string
}

export interface ForumPendingAttachments {
  imageUrl?: string
  audioUrl?: string
}

export interface ForumLoungeMessage {
  id: string
  authorName: string
  body: string
  createdAt: string
}
