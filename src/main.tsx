import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isTurnstileEnabled } from './lib/turnstileConfig'
import { preloadTurnstileScript } from './lib/turnstileLoader'

if (isTurnstileEnabled()) {
  preloadTurnstileScript().catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
