/// <reference types="vite/client" />

declare module '*.svg?raw' {
  const content: string
  export default content
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_MODERATOR_KEY?: string
  readonly VITE_AUDIO_RESOLVER_URL?: string
  readonly VITE_AUDIO_PROXY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
