import type {
  ForumBoardDetail,
  ForumCategory,
  ForumPinnedThread,
  ForumPost,
  ForumThreadDetail,
  ForumThreadSummary,
} from '../types/forum'
import { clearForumSession, readForumSession, writeForumSession } from './forumStorage'
import { readModeratorSession } from './moderatorStorage'
import { isSupabaseConfigured } from './supabaseClient'

export class ForumApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ForumApiError'
    this.status = status
  }
}

function baseUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!isSupabaseConfigured() || !supabaseUrl) {
    throw new ForumApiError('Forum ist nicht konfiguriert (Supabase fehlt).', 503)
  }
  return supabaseUrl.replace(/\/$/, '')
}

function authHeaders(): Record<string, string> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`
    headers.apikey = anonKey
  }
  return headers
}

export function forumHeaders(): Record<string, string> {
  const session = readForumSession()
  if (!session) {
    throw new ForumApiError('Nicht angemeldet.', 401)
  }
  return { ...authHeaders(), 'x-forum-session': session }
}

function forumModeratorHeaders(): Record<string, string> {
  const headers = forumHeaders()
  const mod = readModeratorSession()
  if (!mod) {
    throw new ForumApiError('Moderator nicht angemeldet.', 403)
  }
  return { ...headers, 'x-moderator-session': mod }
}

function forumHeadersWithOptionalModerator(): Record<string, string> {
  const headers = forumHeaders()
  const mod = readModeratorSession()
  if (mod) {
    headers['x-moderator-session'] = mod
  }
  return headers
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string }

  if (!response.ok) {
    if (response.status === 401) {
      clearForumSession()
    }
    throw new ForumApiError(data.error ?? response.statusText, response.status)
  }

  return data
}

export async function forumLogin(password: string): Promise<void> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-auth`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ password }),
  })

  const data = await parseResponse<{ sessionToken: string }>(response)
  writeForumSession(data.sessionToken)
}

export type ForumStructure = {
  categories: ForumCategory[]
  pinnedThreads: ForumPinnedThread[]
}

export async function forumFetchStructure(): Promise<ForumStructure> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumHeaders(),
    body: JSON.stringify({ action: 'structure' }),
  })

  return parseResponse(response)
}

export async function forumFetchThreads(boardId: string): Promise<{
  board: ForumBoardDetail
  threads: ForumThreadSummary[]
}> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumHeaders(),
    body: JSON.stringify({ action: 'threads', boardId }),
  })

  return parseResponse(response)
}

export async function forumFetchThread(threadId: string): Promise<{
  thread: ForumThreadDetail
  posts: ForumPost[]
}> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumHeaders(),
    body: JSON.stringify({ action: 'thread', threadId }),
  })

  return parseResponse(response)
}

export async function forumCreateThread(params: {
  boardId: string
  title: string
  body: string
  authorName: string
  songId?: string
  imageUrl?: string
  audioUrl?: string
}): Promise<string> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumHeaders(),
    body: JSON.stringify({ action: 'create_thread', ...params }),
  })

  const data = await parseResponse<{ threadId: string }>(response)
  return data.threadId
}

export async function forumCreatePost(params: {
  threadId: string
  body: string
  authorName: string
  songId?: string
  imageUrl?: string
  audioUrl?: string
}): Promise<string> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumHeaders(),
    body: JSON.stringify({ action: 'create_post', ...params }),
  })

  const data = await parseResponse<{ postId: string }>(response)
  return data.postId
}

export async function forumDeletePost(params: {
  postId: string
  authorName?: string
}): Promise<{ threadDeleted?: boolean }> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumHeadersWithOptionalModerator(),
    body: JSON.stringify({ action: 'delete_post', ...params }),
  })

  return parseResponse(response)
}

export async function forumUpdatePost(params: {
  postId: string
  body: string
  authorName: string
  songId?: string | null
}): Promise<void> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumHeadersWithOptionalModerator(),
    body: JSON.stringify({ action: 'update_post', ...params }),
  })

  await parseResponse(response)
}

export async function forumUpdateThread(params: {
  threadId: string
  title: string
  authorName: string
}): Promise<void> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumHeadersWithOptionalModerator(),
    body: JSON.stringify({ action: 'update_thread', ...params }),
  })

  await parseResponse(response)
}

export async function forumAdminUpsertCategory(params: {
  categoryId?: string
  name: string
  description?: string
  sortOrder?: number
}): Promise<string> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumModeratorHeaders(),
    body: JSON.stringify({ action: 'admin_upsert_category', ...params }),
  })

  const data = await parseResponse<{ categoryId: string }>(response)
  return data.categoryId
}

export async function forumAdminDeleteCategory(categoryId: string): Promise<void> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumModeratorHeaders(),
    body: JSON.stringify({ action: 'admin_delete_category', categoryId }),
  })

  await parseResponse(response)
}

export async function forumAdminUpsertBoard(params: {
  boardId?: string
  categoryId: string
  name: string
  description?: string
  sortOrder?: number
}): Promise<string> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumModeratorHeaders(),
    body: JSON.stringify({ action: 'admin_upsert_board', ...params }),
  })

  const data = await parseResponse<{ boardId: string }>(response)
  return data.boardId
}

export async function forumAdminDeleteBoard(boardId: string): Promise<void> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumModeratorHeaders(),
    body: JSON.stringify({ action: 'admin_delete_board', boardId }),
  })

  await parseResponse(response)
}

export type ForumBackup = {
  version: number
  exportedAt: string
  categories: Array<{
    id: string
    name: string
    description?: string
    sortOrder: number
    createdAt: string
  }>
  boards: Array<{
    id: string
    categoryId: string
    name: string
    description?: string
    sortOrder: number
    createdAt: string
  }>
  threads: Array<{
    id: string
    boardId: string
    title: string
    authorName: string
    songId?: string
    isPinned: boolean
    isLocked: boolean
    createdAt: string
    updatedAt: string
  }>
  posts: Array<{
    id: string
    threadId: string
    authorName: string
    body: string
    songId?: string
    imageUrl?: string
    audioUrl?: string
    createdAt: string
  }>
}

export async function forumAdminDownloadBackup(): Promise<void> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumModeratorHeaders(),
    body: JSON.stringify({ action: 'admin_export_forum' }),
  })

  const data = await parseResponse<{ backup: ForumBackup }>(response)
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `songmash-forum-backup-${stamp}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function forumAdminMoveThread(threadId: string, boardId: string): Promise<string> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumModeratorHeaders(),
    body: JSON.stringify({ action: 'admin_move_thread', threadId, boardId }),
  })

  const data = await parseResponse<{ boardId: string }>(response)
  return data.boardId
}

export async function forumAdminLockThread(threadId: string, locked: boolean): Promise<void> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumModeratorHeaders(),
    body: JSON.stringify({ action: 'admin_lock_thread', threadId, locked }),
  })

  await parseResponse(response)
}

export async function forumAdminPinThread(threadId: string, pinned: boolean): Promise<void> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumModeratorHeaders(),
    body: JSON.stringify({ action: 'admin_pin_thread', threadId, pinned }),
  })

  await parseResponse(response)
}

export async function forumAdminDeleteThread(threadId: string): Promise<void> {
  const response = await fetch(`${baseUrl()}/functions/v1/forum-api`, {
    method: 'POST',
    headers: forumModeratorHeaders(),
    body: JSON.stringify({ action: 'admin_delete_thread', threadId }),
  })

  await parseResponse(response)
}

export function isForumConfigured(): boolean {
  return isSupabaseConfigured()
}
