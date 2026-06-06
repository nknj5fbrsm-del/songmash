import { useEffect, useId, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getTurnstileSiteKey } from '../lib/turnstileConfig'
import { preloadTurnstileScript } from '../lib/turnstileLoader'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void
  onExpire: () => void
  onError?: () => void
}

export function TurnstileWidget({ onToken, onExpire, onError }: TurnstileWidgetProps) {
  const siteKey = getTurnstileSiteKey()
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const labelId = useId()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const onTokenRef = useRef(onToken)
  const onExpireRef = useRef(onExpire)
  const onErrorRef = useRef(onError)
  onTokenRef.current = onToken
  onExpireRef.current = onExpire
  onErrorRef.current = onError

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let cancelled = false
    setStatus('loading')

    preloadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'dark',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onExpireRef.current(),
          'error-callback': () => {
            onExpireRef.current()
            onErrorRef.current?.()
            setStatus('error')
          },
        })
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          onErrorRef.current?.()
        }
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [siteKey])

  if (!siteKey) return null

  return (
    <section
      className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-4"
      aria-labelledby={labelId}
    >
      <p id={labelId} className="mb-3 text-sm text-neutral-400">
        Diese Seite ist vor Spam geschützt.
      </p>
      {status === 'loading' && (
        <p className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Captcha wird geladen…
        </p>
      )}
      {status === 'error' && (
        <p className="mb-2 text-sm text-red-400">
          Captcha konnte nicht geladen werden. Seite neu laden oder später erneut versuchen.
        </p>
      )}
      <div ref={containerRef} className="min-h-[65px]" />
    </section>
  )
}
