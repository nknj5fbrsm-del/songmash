/**
 * Forum-API (Kategorien, Threads, Beiträge). Erfordert gültige Forum-Session.
 * Admin-Aktionen zusätzlich Moderator-Session (x-moderator-session).
 * Deploy: supabase functions deploy forum-api
 * Secrets: FORUM_PASSWORD, MODERATOR_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { normalizeForumAttachmentUrl, purgeForumAttachments } from '../_shared/forumAssets.ts'
import { requireForumSession, verifyForumSession } from '../_shared/forumSession.ts'
import { isModeratorRequest, requireModeratorRequest } from '../_shared/moderatorRequest.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-forum-session, x-moderator-session',
}

const MAX_AUTHOR = 32
const MAX_TITLE = 120
const MAX_BODY = 10_000
const MAX_NAME = 80
const MAX_DESC = 250

type ActionBody = {
  action?: string
  boardId?: string
  threadId?: string
  postId?: string
  categoryId?: string
  title?: string
  body?: string
  authorName?: string
  songId?: string
  imageUrl?: string
  audioUrl?: string
  name?: string
  description?: string
  sortOrder?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const forumSecret = Deno.env.get('FORUM_PASSWORD')?.trim()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!forumSecret || !supabaseUrl || !serviceKey) {
    return json({ error: 'Server-Konfiguration unvollständig.' }, 500)
  }

  const session = requireForumSession(req)
  if (!session || !(await verifyForumSession(session, forumSecret))) {
    return json({ error: 'Forum-Session ungültig oder abgelaufen. Bitte erneut anmelden.' }, 401)
  }

  try {
    const body = (await req.json()) as ActionBody
    const action = body.action?.trim()
    if (!action) return json({ error: 'Aktion fehlt.' }, 400)

    const supabase = createClient(supabaseUrl, serviceKey)

    switch (action) {
      case 'structure':
        return await handleStructure(supabase)
      case 'threads':
        return await handleThreads(supabase, body.boardId)
      case 'thread':
        return await handleThread(supabase, body.threadId)
      case 'create_thread':
        return await handleCreateThread(supabase, body)
      case 'create_post':
        return await handleCreatePost(supabase, body)
      case 'delete_post':
        return await handleDeletePost(supabase, body, req)
      case 'update_post':
        return await handleUpdatePost(supabase, body, req)
      case 'admin_upsert_category':
        return await handleAdminUpsertCategory(supabase, body, req)
      case 'admin_delete_category':
        return await handleAdminDeleteCategory(supabase, body, req)
      case 'admin_upsert_board':
        return await handleAdminUpsertBoard(supabase, body, req)
      case 'admin_delete_board':
        return await handleAdminDeleteBoard(supabase, body, req)
      case 'admin_move_thread':
        return await handleAdminMoveThread(supabase, body, req)
      case 'admin_export_forum':
        return await handleAdminExportForum(supabase, req)
      default:
        return json({ error: 'Unbekannte Aktion.' }, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Anfrage fehlgeschlagen.'
    return json({ error: message }, 400)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function trimAuthor(name: string | undefined): string {
  const trimmed = name?.trim() ?? ''
  if (trimmed.length < 2 || trimmed.length > MAX_AUTHOR) {
    throw new Error(`Anzeigename muss 2–${MAX_AUTHOR} Zeichen haben.`)
  }
  return trimmed
}

async function loadPostForAction(
  supabase: ReturnType<typeof createClient>,
  postId: string,
) {
  const { data: post, error } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!post) throw new Error('Beitrag nicht gefunden.')
  return post
}

function assertOwnPost(body: ActionBody, authorNameInDb: string): void {
  const authorName = trimAuthor(body.authorName)
  if (authorNameInDb !== authorName) {
    throw new Error('Du kannst nur eigene Beiträge bearbeiten oder löschen.')
  }
}

async function handleStructure(supabase: ReturnType<typeof createClient>) {
  const { data: categories, error: catError } = await supabase
    .from('forum_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (catError) throw new Error(catError.message)

  const { data: boards, error: boardError } = await supabase
    .from('forum_boards')
    .select('*')
    .order('sort_order', { ascending: true })

  if (boardError) throw new Error(boardError.message)

  const boardIds = (boards ?? []).map((b) => b.id)
  const threadCounts = new Map<string, number>()
  const latestActivityByBoard = new Map<string, string>()

  if (boardIds.length > 0) {
    const { data: threads, error: threadError } = await supabase
      .from('forum_threads')
      .select('board_id, updated_at')
      .in('board_id', boardIds)

    if (threadError) throw new Error(threadError.message)

    for (const row of threads ?? []) {
      threadCounts.set(row.board_id, (threadCounts.get(row.board_id) ?? 0) + 1)
      const prev = latestActivityByBoard.get(row.board_id)
      if (!prev || row.updated_at > prev) {
        latestActivityByBoard.set(row.board_id, row.updated_at)
      }
    }
  }

  return json({
    categories: (categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      sortOrder: c.sort_order,
      boards: (boards ?? [])
        .filter((b) => b.category_id === c.id)
        .map((b) => ({
          id: b.id,
          categoryId: b.category_id,
          name: b.name,
          description: b.description ?? undefined,
          sortOrder: b.sort_order,
          threadCount: threadCounts.get(b.id) ?? 0,
          latestActivityAt: latestActivityByBoard.get(b.id) ?? undefined,
        })),
    })),
  })
}

async function handleThreads(supabase: ReturnType<typeof createClient>, boardId?: string) {
  if (!boardId?.trim()) throw new Error('boardId fehlt.')

  const { data: board, error: boardError } = await supabase
    .from('forum_boards')
    .select('*, forum_categories(name)')
    .eq('id', boardId)
    .maybeSingle()

  if (boardError) throw new Error(boardError.message)
  if (!board) throw new Error('Unterbereich nicht gefunden.')

  const { data: threads, error } = await supabase
    .from('forum_threads')
    .select('*')
    .eq('board_id', boardId)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  const threadIds = (threads ?? []).map((t) => t.id)
  const postCounts = new Map<string, number>()

  if (threadIds.length > 0) {
    const { data: posts, error: postError } = await supabase
      .from('forum_posts')
      .select('thread_id')
      .in('thread_id', threadIds)

    if (postError) throw new Error(postError.message)

    for (const row of posts ?? []) {
      postCounts.set(row.thread_id, (postCounts.get(row.thread_id) ?? 0) + 1)
    }
  }

  const category = board.forum_categories as { name?: string } | null

  return json({
    board: {
      id: board.id,
      categoryId: board.category_id,
      categoryName: category?.name ?? '',
      name: board.name,
      description: board.description ?? undefined,
    },
    threads: (threads ?? []).map((t) => ({
      id: t.id,
      boardId: t.board_id,
      title: t.title,
      authorName: t.author_name,
      songId: t.song_id ?? undefined,
      isPinned: t.is_pinned,
      isLocked: t.is_locked,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      postCount: postCounts.get(t.id) ?? 0,
    })),
  })
}

async function handleThread(supabase: ReturnType<typeof createClient>, threadId?: string) {
  if (!threadId?.trim()) throw new Error('threadId fehlt.')

  const { data: thread, error: threadError } = await supabase
    .from('forum_threads')
    .select('*, forum_boards(id, name, category_id, forum_categories(name))')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError) throw new Error(threadError.message)
  if (!thread) throw new Error('Thema nicht gefunden.')

  const { data: posts, error: postError } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (postError) throw new Error(postError.message)

  const board = thread.forum_boards as {
    id: string
    name: string
    category_id: string
    forum_categories: { name?: string } | null
  }

  return json({
    thread: {
      id: thread.id,
      boardId: thread.board_id,
      boardName: board.name,
      categoryName: board.forum_categories?.name ?? '',
      title: thread.title,
      authorName: thread.author_name,
      songId: thread.song_id ?? undefined,
      isPinned: thread.is_pinned,
      isLocked: thread.is_locked,
      createdAt: thread.created_at,
      updatedAt: thread.updated_at,
    },
    posts: (posts ?? []).map((p) => ({
      id: p.id,
      threadId: p.thread_id,
      authorName: p.author_name,
      body: p.body,
      songId: p.song_id ?? undefined,
      imageUrl: p.image_url ?? undefined,
      audioUrl: p.audio_url ?? undefined,
      createdAt: p.created_at,
    })),
  })
}

async function handleCreateThread(supabase: ReturnType<typeof createClient>, body: ActionBody) {
  const boardId = body.boardId?.trim()
  const title = body.title?.trim() ?? ''
  const postBody = body.body?.trim() ?? ''
  const authorName = trimAuthor(body.authorName)

  if (!boardId) throw new Error('boardId fehlt.')
  if (title.length < 3 || title.length > MAX_TITLE) {
    throw new Error(`Titel muss 3–${MAX_TITLE} Zeichen haben.`)
  }
  if (postBody.length < 1 || postBody.length > MAX_BODY) {
    throw new Error(`Beitrag muss 1–${MAX_BODY} Zeichen haben.`)
  }

  const songId = body.songId?.trim() || null
  if (songId) await assertSongExists(supabase, songId)

  const imageUrl = normalizeForumAttachmentUrl(body.imageUrl)
  const audioUrl = normalizeForumAttachmentUrl(body.audioUrl)

  const now = new Date().toISOString()

  const { data: thread, error: threadError } = await supabase
    .from('forum_threads')
    .insert({
      board_id: boardId,
      title,
      author_name: authorName,
      song_id: songId,
      updated_at: now,
    })
    .select('*')
    .single()

  if (threadError) throw new Error(threadError.message)

  const { error: postError } = await supabase.from('forum_posts').insert({
    thread_id: thread.id,
    author_name: authorName,
    body: postBody,
    song_id: songId,
    image_url: imageUrl,
    audio_url: audioUrl,
  })

  if (postError) throw new Error(postError.message)

  return json({ threadId: thread.id })
}

async function handleCreatePost(supabase: ReturnType<typeof createClient>, body: ActionBody) {
  const threadId = body.threadId?.trim()
  const postBody = body.body?.trim() ?? ''
  const authorName = trimAuthor(body.authorName)

  if (!threadId) throw new Error('threadId fehlt.')
  if (postBody.length < 1 || postBody.length > MAX_BODY) {
    throw new Error(`Beitrag muss 1–${MAX_BODY} Zeichen haben.`)
  }

  const { data: thread, error: threadError } = await supabase
    .from('forum_threads')
    .select('is_locked')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError) throw new Error(threadError.message)
  if (!thread) throw new Error('Thema nicht gefunden.')
  if (thread.is_locked) throw new Error('Dieses Thema ist geschlossen.')

  const songId = body.songId?.trim() || null
  if (songId) await assertSongExists(supabase, songId)

  const imageUrl = normalizeForumAttachmentUrl(body.imageUrl)
  const audioUrl = normalizeForumAttachmentUrl(body.audioUrl)

  const { data: post, error } = await supabase
    .from('forum_posts')
    .insert({
      thread_id: threadId,
      author_name: authorName,
      body: postBody,
      song_id: songId,
      image_url: imageUrl,
      audio_url: audioUrl,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await supabase
    .from('forum_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId)

  return json({ postId: post.id })
}

async function handleDeletePost(
  supabase: ReturnType<typeof createClient>,
  body: ActionBody,
  req: Request,
) {
  const postId = body.postId?.trim()
  if (!postId) throw new Error('postId fehlt.')

  const post = await loadPostForAction(supabase, postId)
  const asModerator = await isModeratorRequest(req)
  if (!asModerator) {
    assertOwnPost(body, post.author_name)
  }

  const { data: threadPosts, error: listError } = await supabase
    .from('forum_posts')
    .select('id')
    .eq('thread_id', post.thread_id)
    .order('created_at', { ascending: true })

  if (listError) throw new Error(listError.message)

  const allPosts = threadPosts ?? []
  const isOnlyPost = allPosts.length === 1
  const isFirstPost = allPosts[0]?.id === postId

  if (!asModerator && isFirstPost && allPosts.length > 1) {
    throw new Error(
      'Eröffnungsbeitrag kann nicht gelöscht werden, solange Antworten existieren.',
    )
  }

  if (isOnlyPost) {
    await purgeForumAttachments(post)
    const { error: threadError } = await supabase
      .from('forum_threads')
      .delete()
      .eq('id', post.thread_id)
    if (threadError) throw new Error(threadError.message)
    return json({ ok: true, threadDeleted: true })
  }

  await purgeForumAttachments(post)
  const { error } = await supabase.from('forum_posts').delete().eq('id', postId)
  if (error) throw new Error(error.message)

  await supabase
    .from('forum_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', post.thread_id)

  return json({ ok: true })
}

async function handleUpdatePost(
  supabase: ReturnType<typeof createClient>,
  body: ActionBody,
  req: Request,
) {
  const postId = body.postId?.trim()
  const postBody = body.body?.trim() ?? ''
  if (!postId) throw new Error('postId fehlt.')
  if (postBody.length < 1 || postBody.length > MAX_BODY) {
    throw new Error(`Beitrag muss 1–${MAX_BODY} Zeichen haben.`)
  }

  const post = await loadPostForAction(supabase, postId)
  if (!(await isModeratorRequest(req))) {
    assertOwnPost(body, post.author_name)
  }

  const { data: thread, error: threadError } = await supabase
    .from('forum_threads')
    .select('is_locked')
    .eq('id', post.thread_id)
    .maybeSingle()

  if (threadError) throw new Error(threadError.message)
  if (!thread) throw new Error('Thema nicht gefunden.')
  if (thread.is_locked) throw new Error('Dieses Thema ist geschlossen.')

  const songId =
    body.songId !== undefined ? body.songId?.trim() || null : post.song_id
  if (songId) await assertSongExists(supabase, songId)

  const { error } = await supabase
    .from('forum_posts')
    .update({ body: postBody, song_id: songId })
    .eq('id', postId)

  if (error) throw new Error(error.message)

  const { data: firstPost, error: firstError } = await supabase
    .from('forum_posts')
    .select('id')
    .eq('thread_id', post.thread_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (firstError) throw new Error(firstError.message)

  const now = new Date().toISOString()
  const threadUpdate: { updated_at: string; song_id?: string | null } = { updated_at: now }
  if (firstPost?.id === postId) {
    threadUpdate.song_id = songId
  }

  await supabase.from('forum_threads').update(threadUpdate).eq('id', post.thread_id)

  return json({ ok: true })
}

async function handleAdminUpsertCategory(
  supabase: ReturnType<typeof createClient>,
  body: ActionBody,
  req: Request,
) {
  await requireModeratorRequest(req)

  const name = body.name?.trim() ?? ''
  const description = body.description?.trim().slice(0, MAX_DESC) || null
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0

  if (name.length < 1 || name.length > MAX_NAME) {
    throw new Error(`Name muss 1–${MAX_NAME} Zeichen haben.`)
  }

  const categoryId = body.categoryId?.trim()

  if (categoryId) {
    const { error } = await supabase
      .from('forum_categories')
      .update({ name, description, sort_order: sortOrder })
      .eq('id', categoryId)
    if (error) throw new Error(error.message)
    return json({ categoryId })
  }

  const { data, error } = await supabase
    .from('forum_categories')
    .insert({ name, description, sort_order: sortOrder })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return json({ categoryId: data.id })
}

async function handleAdminDeleteCategory(
  supabase: ReturnType<typeof createClient>,
  body: ActionBody,
  req: Request,
) {
  await requireModeratorRequest(req)
  const categoryId = body.categoryId?.trim()
  if (!categoryId) throw new Error('categoryId fehlt.')

  const { error } = await supabase.from('forum_categories').delete().eq('id', categoryId)
  if (error) throw new Error(error.message)

  return json({ ok: true })
}

async function handleAdminUpsertBoard(
  supabase: ReturnType<typeof createClient>,
  body: ActionBody,
  req: Request,
) {
  await requireModeratorRequest(req)

  const categoryId = body.categoryId?.trim()
  const name = body.name?.trim() ?? ''
  const description = body.description?.trim().slice(0, MAX_DESC) || null
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0
  const boardId = body.boardId?.trim()

  if (!categoryId) throw new Error('categoryId fehlt.')
  if (name.length < 1 || name.length > MAX_NAME) {
    throw new Error(`Name muss 1–${MAX_NAME} Zeichen haben.`)
  }

  if (boardId) {
    const { error } = await supabase
      .from('forum_boards')
      .update({
        category_id: categoryId,
        name,
        description,
        sort_order: sortOrder,
      })
      .eq('id', boardId)
    if (error) throw new Error(error.message)
    return json({ boardId })
  }

  const { data, error } = await supabase
    .from('forum_boards')
    .insert({
      category_id: categoryId,
      name,
      description,
      sort_order: sortOrder,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return json({ boardId: data.id })
}

async function handleAdminDeleteBoard(
  supabase: ReturnType<typeof createClient>,
  body: ActionBody,
  req: Request,
) {
  await requireModeratorRequest(req)
  const boardId = body.boardId?.trim()
  if (!boardId) throw new Error('boardId fehlt.')

  const { error } = await supabase.from('forum_boards').delete().eq('id', boardId)
  if (error) throw new Error(error.message)

  return json({ ok: true })
}

async function handleAdminExportForum(supabase: ReturnType<typeof createClient>, req: Request) {
  await requireModeratorRequest(req)

  const [
    { data: categories, error: catError },
    { data: boards, error: boardError },
    { data: threads, error: threadError },
    { data: posts, error: postError },
  ] = await Promise.all([
    supabase.from('forum_categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('forum_boards').select('*').order('sort_order', { ascending: true }),
    supabase.from('forum_threads').select('*').order('created_at', { ascending: true }),
    supabase.from('forum_posts').select('*').order('created_at', { ascending: true }),
  ])

  if (catError) throw new Error(catError.message)
  if (boardError) throw new Error(boardError.message)
  if (threadError) throw new Error(threadError.message)
  if (postError) throw new Error(postError.message)

  return json({
    backup: {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: (categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? undefined,
        sortOrder: c.sort_order,
        createdAt: c.created_at,
      })),
      boards: (boards ?? []).map((b) => ({
        id: b.id,
        categoryId: b.category_id,
        name: b.name,
        description: b.description ?? undefined,
        sortOrder: b.sort_order,
        createdAt: b.created_at,
      })),
      threads: (threads ?? []).map((t) => ({
        id: t.id,
        boardId: t.board_id,
        title: t.title,
        authorName: t.author_name,
        songId: t.song_id ?? undefined,
        isPinned: t.is_pinned,
        isLocked: t.is_locked,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
      posts: (posts ?? []).map((p) => ({
        id: p.id,
        threadId: p.thread_id,
        authorName: p.author_name,
        body: p.body,
        songId: p.song_id ?? undefined,
        imageUrl: p.image_url ?? undefined,
        audioUrl: p.audio_url ?? undefined,
        createdAt: p.created_at,
      })),
    },
  })
}

async function handleAdminMoveThread(
  supabase: ReturnType<typeof createClient>,
  body: ActionBody,
  req: Request,
) {
  await requireModeratorRequest(req)

  const threadId = body.threadId?.trim()
  const boardId = body.boardId?.trim()
  if (!threadId || !boardId) throw new Error('threadId und boardId fehlen.')

  const { data: board, error: boardError } = await supabase
    .from('forum_boards')
    .select('id')
    .eq('id', boardId)
    .maybeSingle()

  if (boardError) throw new Error(boardError.message)
  if (!board) throw new Error('Ziel-Unterbereich nicht gefunden.')

  const { data: thread, error: threadError } = await supabase
    .from('forum_threads')
    .select('board_id')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError) throw new Error(threadError.message)
  if (!thread) throw new Error('Thema nicht gefunden.')
  if (thread.board_id === boardId) {
    throw new Error('Thema liegt bereits in diesem Unterbereich.')
  }

  const { error } = await supabase
    .from('forum_threads')
    .update({
      board_id: boardId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)

  if (error) throw new Error(error.message)

  return json({ ok: true, boardId })
}

async function assertSongExists(supabase: ReturnType<typeof createClient>, songId: string) {
  const { data, error } = await supabase.from('songs').select('id').eq('id', songId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Song nicht gefunden.')
}
