import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  CheckCircle,
  Copy,
  FileAudio,
  ImageIcon,
  Link2,
  Loader2,
  PlayCircle,
  Upload,
  X,
} from 'lucide-react'
import { createDeletionToken } from '../lib/deletionToken'
import { useSongs } from '../context/SongContext'
import { isHostedAssetUrl } from '../lib/assetUrls'
import { getPlayableAudioUrl } from '../lib/audioProxy'
import { importAudioToStorage } from '../lib/importAudio'
import { resolveAudioUrl, type AudioSource } from '../lib/resolveAudioUrl'
import { clearSubmissionSession, openSubmissionSession } from '../lib/submissionSession'
import { testAudioPlayback } from '../lib/testAudio'
import { isTurnstileEnabled } from '../lib/turnstileConfig'
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TECH_TAGS_LENGTH,
  parseTechTagsInput,
  resolveAudioFromFile,
  resolveCoverUrl,
  prepareCoverFile,
  validateAudioFile,
} from '../lib/uploadAsset'
import { DropZone } from './DropZone'
import { SubmissionRulesModal } from './SubmissionRulesModal'
import { TurnstileWidget } from './TurnstileWidget'

type Tab = 'file' | 'link'
type TestStatus = 'idle' | 'resolving' | 'testing' | 'ok' | 'error'

const SOURCE_LABELS: Record<AudioSource, string> = {
  direct: 'Direkter Audio-Link',
  suno: 'Suno (aufgelöst)',
  udio: 'Udio (aufgelöst)',
  soundcloud: 'SoundCloud (aufgelöst)',
  resolved: 'Seiten-Link (aufgelöst)',
}

interface SubmitSongPageProps {
  isActive?: boolean
  onLeave?: () => void
}

export function SubmitSongPage({ isActive = true, onLeave }: SubmitSongPageProps) {
  const { submitSong } = useSongs()
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [rulesModalOpen, setRulesModalOpen] = useState(false)
  const [rulesModalMode, setRulesModalMode] = useState<'gate' | 'review'>('gate')
  const [tab, setTab] = useState<Tab>('file')

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [deletionToken, setDeletionToken] = useState<string | null>(null)
  const [copyHint, setCopyHint] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [linkInput, setLinkInput] = useState('')
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [audioSource, setAudioSource] = useState<AudioSource | null>(null)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testError, setTestError] = useState('')

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [coverError, setCoverError] = useState('')
  const [isPreparingCover, setIsPreparingCover] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0)

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null)
    clearSubmissionSession()
  }, [])

  useEffect(() => {
    if (!isActive) {
      setRulesModalOpen(false)
      return
    }
    setRulesAccepted(false)
    setRulesModalOpen(true)
    setRulesModalMode('gate')
  }, [isActive])

  useEffect(() => {
    return () => {
      if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl)
      if (coverPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(coverPreviewUrl)
    }
  }, [audioPreviewUrl, coverPreviewUrl])

  const resetAudioTest = useCallback(() => {
    setResolvedUrl(null)
    setSourceUrl(null)
    setAudioSource(null)
    setTestStatus('idle')
    setTestError('')
  }, [])

  const resetForm = useCallback(() => {
    setTitle('')
    setArtist('')
    setDescription('')
    setTagsInput('')
    setLinkInput('')
    setAudioFile(null)
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl)
    setAudioPreviewUrl(null)
    setCoverFile(null)
    if (coverPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl(null)
    setCoverError('')
    resetAudioTest()
  }, [audioPreviewUrl, coverPreviewUrl, resetAudioTest])

  const handleCoverFile = async (file: File) => {
    setCoverError('')
    setIsPreparingCover(true)

    try {
      const prepared = await prepareCoverFile(file)
      setCoverFile(prepared)
      if (coverPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(coverPreviewUrl)
      setCoverPreviewUrl(URL.createObjectURL(prepared))
    } catch (err) {
      setCoverFile(null)
      if (coverPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(coverPreviewUrl)
      setCoverPreviewUrl(null)
      setCoverError(err instanceof Error ? err.message : 'Cover konnte nicht verarbeitet werden.')
    } finally {
      setIsPreparingCover(false)
    }
  }

  const clearCover = () => {
    setCoverFile(null)
    if (coverPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl(null)
    setCoverError('')
  }

  const handleAudioFile = async (file: File) => {
    const validationError = validateAudioFile(file)
    if (validationError) {
      setTestStatus('error')
      setTestError(validationError)
      return
    }

    setAudioFile(file)
    setLinkInput('')
    resetAudioTest()
    setTestStatus('testing')
    setTestError('')

    const preview = URL.createObjectURL(file)
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl)
    setAudioPreviewUrl(preview)

    try {
      await testAudioPlayback(preview)
      setTestStatus('ok')
    } catch (err) {
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Audio-Test fehlgeschlagen.')
    }
  }

  const handleLinkChange = (value: string) => {
    setLinkInput(value)
    setAudioFile(null)
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl)
    setAudioPreviewUrl(null)
    if (testStatus !== 'idle') resetAudioTest()
  }

  const handleLinkTest = async () => {
    setError('')
    setTestError('')
    setTestStatus('resolving')

    const result = await resolveAudioUrl(linkInput)

    if (!result.ok) {
      setTestStatus('error')
      setTestError(result.error)
      return
    }

    setResolvedUrl(result.audioUrl)
    setSourceUrl(result.sourceUrl)
    setAudioSource(result.source)
    setTestStatus('testing')

    try {
      setResolvedUrl(result.audioUrl)
      await testAudioPlayback(getPlayableAudioUrl(result.audioUrl))
      setTestStatus('ok')
    } catch (err) {
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Audio-Test fehlgeschlagen.')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setError('')

    if (!title.trim() || !artist.trim()) {
      setError('Titel und Artist sind Pflichtfelder.')
      return
    }

    if (testStatus !== 'ok') {
      setError(
        tab === 'file'
          ? 'Bitte zuerst eine Audio-Datei hochladen und testen.'
          : 'Bitte zuerst den Link auflösen und erfolgreich testen.',
      )
      return
    }

    if (isTurnstileEnabled() && !turnstileToken) {
      setError('Bitte zuerst die Sicherheitsprüfung bestätigen.')
      return
    }

    const techStackTags = parseTechTagsInput(tagsInput)

    setIsSubmitting(true)

    try {
      if (isTurnstileEnabled() && turnstileToken) {
        await openSubmissionSession(turnstileToken)
      }

      let audioUrl: string
      if (tab === 'file' && audioFile) {
        audioUrl = await resolveAudioFromFile(audioFile)
      } else if (resolvedUrl) {
        audioUrl = resolvedUrl
        if (!isHostedAssetUrl(audioUrl)) {
          audioUrl = await importAudioToStorage(sourceUrl ?? audioUrl)
        }
      } else {
        setError('Keine Audio-Quelle gefunden.')
        return
      }

      const coverUrl = await resolveCoverUrl(coverFile)
      const { token, tokenHash } = await createDeletionToken()

      await submitSong(
        {
          title: title.trim(),
          artist: artist.trim(),
          audioUrl,
          sourceUrl: tab === 'link' ? (sourceUrl ?? undefined) : undefined,
          coverUrl,
          description: description.trim() || undefined,
          techStackTags,
        },
        tokenHash,
      )

      resetForm()
      setDeletionToken(token)
      setTurnstileToken(null)
      setTurnstileWidgetKey((k) => k + 1)
      clearSubmissionSession()
    } catch (err) {
      clearSubmissionSession()
      setTurnstileToken(null)
      setTurnstileWidgetKey((k) => k + 1)
      setError(err instanceof Error ? err.message : 'Song konnte nicht eingereicht werden.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const turnstileOk = !isTurnstileEnabled() || Boolean(turnstileToken)
  const canSubmit = rulesAccepted && testStatus === 'ok' && turnstileOk && !isSubmitting

  const handleRulesAccept = () => {
    setRulesAccepted(true)
    setRulesModalOpen(false)
  }

  const handleRulesCancel = () => {
    setRulesModalOpen(false)
    if (rulesModalMode === 'gate') onLeave?.()
  }

  const openRulesReview = () => {
    setRulesModalMode('review')
    setRulesModalOpen(true)
  }
  const previewUrl =
    tab === 'file' ? audioPreviewUrl : resolvedUrl ? getPlayableAudioUrl(resolvedUrl) : null

  return (
    <div className="mx-auto max-w-2xl">
      <SubmissionRulesModal
        open={rulesModalOpen}
        onAccept={handleRulesAccept}
        onCancel={handleRulesCancel}
      />

      <header className="mb-8 text-center">
        <h1 className="page-title flex items-center justify-center gap-3">
          <Upload className="h-8 w-8 text-lime-400" />
          Song einreichen
        </h1>
        <p className="page-subtitle">
          Datei hochladen oder Link einfügen — optional mit Cover und Infotext.
        </p>
        {rulesAccepted && (
          <button
            type="button"
            onClick={openRulesReview}
            className="mt-2 text-xs text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
          >
            Einreichungsregeln erneut anzeigen
          </button>
        )}
      </header>

      <form
        onSubmit={handleSubmit}
        className={`card space-y-5 p-8 transition-opacity ${
          rulesAccepted ? '' : 'pointer-events-none opacity-40'
        }`}
        aria-hidden={!rulesAccepted}
      >
        <div className="flex gap-2 rounded-xl bg-neutral-800/50 p-1">
          <TabButton active={tab === 'file'} onClick={() => setTab('file')} icon={<FileAudio className="h-4 w-4" />}>
            Datei
          </TabButton>
          <TabButton active={tab === 'link'} onClick={() => setTab('link')} icon={<Link2 className="h-4 w-4" />}>
            Link
          </TabButton>
        </div>

        {tab === 'file' ? (
          <DropZone
            label="Audio hierher ziehen"
            hint="MP3, WAV oder M4A · max. 15 MB"
            accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a"
            icon={<FileAudio className="mb-2 h-8 w-8 text-lime-400" />}
            onFile={handleAudioFile}
            preview={
              audioFile ? (
                <div className="flex w-full items-center gap-3">
                  <FileAudio className="h-8 w-8 shrink-0 text-lime-400" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-neutral-200">{audioFile.name}</p>
                    <p className="text-xs text-neutral-500">
                      {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                      {testStatus === 'testing' && ' · wird getestet…'}
                      {testStatus === 'ok' && ' · bereit'}
                    </p>
                  </div>
                </div>
              ) : undefined
            }
          />
        ) : (
          <>
            <Field label="Link oder Audio-URL" id="linkInput">
              <input
                id="linkInput"
                type="url"
                value={linkInput}
                onChange={(e) => handleLinkChange(e.target.value)}
                placeholder="https://suno.com/song/… oder https://…/track.mp3"
                className="input-field"
              />
            </Field>
            <button
              type="button"
              onClick={handleLinkTest}
              disabled={!linkInput.trim() || testStatus === 'resolving' || testStatus === 'testing'}
              className="btn-ghost w-full"
            >
              {testStatus === 'resolving' || testStatus === 'testing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {testStatus === 'resolving' ? 'Link wird aufgelöst…' : 'Audio wird vorbereitet…'}
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Link auflösen & testen
                </>
              )}
            </button>
          </>
        )}

        {testStatus === 'ok' && previewUrl && (
          <div className="alert-success space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Audio-Test erfolgreich
              {tab === 'link' && audioSource && (
                <span className="font-normal text-lime-400/70">· {SOURCE_LABELS[audioSource]}</span>
              )}
            </p>
            <div className="rounded-lg bg-neutral-800/50 p-3">
              <audio
                src={previewUrl}
                controls
                controlsList="nodownload"
                preload="metadata"
                className="w-full"
              />
            </div>
          </div>
        )}

        {testStatus === 'error' && testError && (
          <p className="alert-error">{testError}</p>
        )}

        <DropZone
          label="Cover hierher ziehen (optional)"
          hint="JPG, PNG oder WebP · große Bilder werden automatisch auf max. 2 MB verkleinert"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          icon={<ImageIcon className="mb-2 h-8 w-8 text-lime-400" />}
          onFile={handleCoverFile}
          disabled={isPreparingCover}
          preview={
            isPreparingCover ? (
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Loader2 className="h-5 w-5 animate-spin text-lime-400" />
                Cover wird optimiert…
              </div>
            ) : coverPreviewUrl ? (
              <div className="relative">
                <img
                  src={coverPreviewUrl}
                  alt="Cover-Vorschau"
                  className="mx-auto h-32 w-32 rounded-xl object-cover shadow-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearCover()
                  }}
                  className="absolute -right-2 -top-2 rounded-full bg-neutral-800 p-1 text-neutral-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : undefined
          }
        />

        {coverError && (
          <p className="alert-error">{coverError}</p>
        )}

        <Field label="Titel" id="title">
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Neon Pulse"
            className="input-field"
          />
        </Field>

        <Field label="Artist" id="artist">
          <input
            id="artist"
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="AI Collective"
            className="input-field"
          />
        </Field>

        <Field label="Infotext" id="description">
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
            placeholder="Wie entstand der Track? Was macht ihn besonders?"
            rows={3}
            className="input-field resize-none"
          />
          <p className="mt-1 text-right text-xs text-neutral-500">
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </p>
        </Field>

        <Field label="Tech-Stack Tags" id="tags" hint="Kommagetrennt, z.B. Suno v3.5, Hybrid">
          <input
            id="tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value.slice(0, MAX_TECH_TAGS_LENGTH))}
            placeholder="Suno v3.5, Hybrid"
            className="input-field"
          />
          <p className="mt-1 text-right text-xs text-neutral-500">
            {tagsInput.length}/{MAX_TECH_TAGS_LENGTH}
          </p>
        </Field>

        {error && (
          <p className="alert-error">{error}</p>
        )}

        {deletionToken && (
          <div className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-lime-300">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Song eingereicht — Lösch-Code sichern
            </p>
            <p className="mb-2 text-xs leading-relaxed text-neutral-400">
              Dieser Code wird <strong className="font-medium text-neutral-300">nur einmal</strong>{' '}
              angezeigt. Kopiere oder notiere ihn jetzt — bevor du den nächsten Song einreichst.
            </p>
            <ul className="mb-3 list-inside list-disc space-y-1 text-xs leading-relaxed text-neutral-500">
              <li>
                <strong className="font-medium text-neutral-400">Mehrere Songs?</strong> Jeder
                Einreichung hat einen <strong className="font-medium text-neutral-400">eigenen</strong>{' '}
                Code. Der vorherige Code verschwindet nach dem nächsten Submit aus dieser Ansicht.
              </li>
              <li>
                Später unter <strong className="font-medium text-neutral-400">Footer → Song entfernen</strong>{' '}
                einfügen. Dort siehst du zuerst Titel &amp; Künstler und bestätigst die Löschung.
              </li>
              <li>
                Nach erfolgreichem Löschen ist der Code verbraucht und ungültig.
              </li>
            </ul>
            <div className="flex items-center gap-2 rounded-lg bg-neutral-950/60 px-3 py-2">
              <code className="flex-1 break-all font-mono text-sm text-neutral-100">
                {deletionToken}
              </code>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(deletionToken)
                    setCopyHint('Kopiert!')
                    setTimeout(() => setCopyHint(''), 2000)
                  } catch {
                    setCopyHint('Kopieren fehlgeschlagen')
                  }
                }}
                className="btn-secondary shrink-0 px-3 py-2"
                aria-label="Lösch-Code kopieren"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copyHint && <p className="mt-2 text-xs text-lime-400/90">{copyHint}</p>}
            <button
              type="button"
              onClick={() => setDeletionToken(null)}
              className="mt-3 text-xs text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
            >
              Hinweis schließen
            </button>
          </div>
        )}

        {isTurnstileEnabled() && (
          <TurnstileWidget
            key={turnstileWidgetKey}
            onToken={setTurnstileToken}
            onExpire={handleTurnstileExpire}
          />
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full"
        >
          {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
          Song einreichen
        </button>
      </form>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-lime-400 text-neutral-950 shadow-lg shadow-lime-400/15'
          : 'text-neutral-400 hover:text-neutral-200'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string
  id: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-300">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}
