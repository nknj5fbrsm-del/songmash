import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import type { Plugin } from 'vite'
import { extractAudioFromPage } from '../supabase/functions/_shared/extractAudioFromPage.ts'
import { fetchProxiedAudio } from '../supabase/functions/_shared/proxyAudio.ts'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

function pipeResponse(upstream: Response, res: ServerResponse) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': upstream.headers.get('content-type') ?? 'audio/mpeg',
    'Accept-Ranges': upstream.headers.get('accept-ranges') ?? 'bytes',
  }

  const contentLength = upstream.headers.get('content-length')
  const contentRange = upstream.headers.get('content-range')
  if (contentLength) headers['Content-Length'] = contentLength
  if (contentRange) headers['Content-Range'] = contentRange

  res.writeHead(upstream.status, headers)

  if (!upstream.body) {
    res.end()
    return
  }

  Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res)
}

export function audioResolverPlugin(): Plugin {
  return {
    name: 'audio-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next()

        const pathname = req.url.split('?')[0]

        if (pathname === '/api/proxy-audio') {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
              'Access-Control-Allow-Headers': 'Range',
            })
            res.end()
            return
          }

          if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          try {
            const params = new URL(req.url, 'http://localhost')
            const targetUrl = params.searchParams.get('url')

            if (!targetUrl) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'URL fehlt' }))
              return
            }

            new URL(targetUrl)

            const upstream = await fetchProxiedAudio(targetUrl, {
              range: typeof req.headers.range === 'string' ? req.headers.range : undefined,
            })

            if (req.method === 'HEAD') {
              const headers: Record<string, string> = {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': upstream.headers.get('content-type') ?? 'audio/mpeg',
                'Accept-Ranges': upstream.headers.get('accept-ranges') ?? 'bytes',
              }
              const contentLength = upstream.headers.get('content-length')
              if (contentLength) headers['Content-Length'] = contentLength
              res.writeHead(upstream.status, headers)
              upstream.body?.cancel()
              res.end()
              return
            }

            pipeResponse(upstream, res)
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Proxy fehlgeschlagen.' }))
          }
          return
        }

        if (pathname === '/api/resolve-audio') {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            })
            res.end()
            return
          }

          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          try {
            const body = JSON.parse(await readBody(req)) as { url?: string }

            if (!body.url) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'URL fehlt' }))
              return
            }

            new URL(body.url)
            const audioUrl = await extractAudioFromPage(body.url)

            if (!audioUrl) {
              res.writeHead(422, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Kein Audio-Link auf der Seite gefunden.' }))
              return
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ audioUrl }))
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Ungültige Anfrage oder URL.' }))
          }
          return
        }

        next()
      })
    },
  }
}
