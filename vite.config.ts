import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { audioResolverPlugin } from './vite-plugins/audioResolver'

export default defineConfig({
  plugins: [react(), tailwindcss(), audioResolverPlugin()],
})
