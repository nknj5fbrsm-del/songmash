/// <reference types="vite/client" />

declare module '*.svg?raw' {
  const content: string
  export default content
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_AUDIO_RESOLVER_URL?: string
  readonly VITE_AUDIO_PROXY_URL?: string
  readonly VITE_PAYPAL_DONATE_URL?: string
  readonly VITE_R2_PUBLIC_URL?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
