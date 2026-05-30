import { getPlayableAudioUrl } from './audioProxy'

export function testAudioPlayback(url: string): Promise<void> {
  const playableUrl = getPlayableAudioUrl(url)

  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.preload = 'metadata'

    const cleanup = () => {
      audio.onloadedmetadata = null
      audio.onerror = null
      audio.src = ''
    }

    audio.onloadedmetadata = () => {
      cleanup()
      resolve()
    }

    audio.onerror = () => {
      cleanup()
      reject(
        new Error(
          'Audio konnte nicht abgespielt werden. Der Link ist evtl. abgelaufen oder blockiert.',
        ),
      )
    }

    audio.src = playableUrl
  })
}
