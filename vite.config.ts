import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { audioResolverPlugin } from './vite-plugins/audioResolver'

/** Ohne trailing slash zeigt Vite nur einen Hinweistext statt der App. */
function redirectBaseWithoutTrailingSlash(): Plugin {
  return {
    name: 'redirect-base-without-trailing-slash',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (url === '/songmash' || url.startsWith('/songmash?')) {
          const suffix = url.slice('/songmash'.length)
          res.writeHead(302, { Location: `/songmash/${suffix}` })
          res.end()
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: '/songmash/',
  plugins: [redirectBaseWithoutTrailingSlash(), react(), tailwindcss(), audioResolverPlugin()],
})
