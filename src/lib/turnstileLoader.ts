const SCRIPT_ID = 'cf-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptLoadPromise: Promise<void> | null = null

function waitForTurnstile(timeoutMs = 15_000): Promise<void> {
  if (window.turnstile) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const started = Date.now()
    const tick = () => {
      if (window.turnstile) {
        resolve()
        return
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error('Turnstile-API nicht rechtzeitig bereit.'))
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
}

/** Lädt das Turnstile-Script so früh wie möglich (App-Start, Hover auf Submit). */
export function preloadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      waitForTurnstile()
        .then(resolve)
        .catch((err) => {
          scriptLoadPromise = null
          reject(err)
        })
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      if (window.turnstile) {
        resolve()
        return
      }
      existing.addEventListener('load', finish, { once: true })
      waitForTurnstile().then(resolve).catch(reject)
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = finish
    script.onerror = () => {
      scriptLoadPromise = null
      reject(new Error('Turnstile konnte nicht geladen werden.'))
    }
    document.head.appendChild(script)
  })

  return scriptLoadPromise
}
