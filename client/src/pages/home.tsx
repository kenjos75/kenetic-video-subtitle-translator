import { zodResolver } from '@hookform/resolvers/zod'
import { Check, CircleAlert, Download, FileVideo, Upload } from 'lucide-react'
import { useState, type ChangeEvent, type DragEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { PageHeader, primaryButtonClass } from '@/components/page-ui'
import { ThemeToggle } from '@/components/theme-toggle'
import { Spinner } from '@/components/ui/spinner'
import { ALLOWED_EXTENSIONS, MAX_SIZE_MB } from '@/constants'
import { useProcessVideo } from '@/hooks/use-process-video'
import {
  formatSize,
  subtitledName,
  videoFormSchema,
  type VideoFormValues,
} from '@/lib/video-schema'

const secondaryButtonClass =
  'inline-flex w-full items-center justify-center rounded-xl border border-line px-5 py-2.5 text-[0.95rem] font-medium text-ink transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

type StepState = 'done' | 'active' | 'pending'

function StepRow({ label, detail, state }: { label: string; detail?: string; state: StepState }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        state === 'active' ? 'border-brand bg-brand/10' : 'border-line'
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        {state === 'done' && <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        {state === 'active' && <Spinner />}
        {state === 'pending' && <span className="h-3 w-3 rounded-full border-2 border-line" />}
      </span>
      <span className={state === 'pending' ? 'text-muted' : 'text-ink'}>{label}</span>
      {detail && <span className="ml-auto text-sm text-muted tabular-nums">{detail}</span>}
    </li>
  )
}

export default function HomePage() {
  const { phase, uploadProgress, result, sourceFile, errorMessage, start, cancel, reset } =
    useProcessVideo()

  const {
    control,
    handleSubmit,
    setValue,
    resetField,
    formState: { errors },
  } = useForm<VideoFormValues>({ resolver: zodResolver(videoFormSchema) })

  const file = useWatch({ control, name: 'file' }) as File | undefined
  const validFile = file && !errors.file ? file : null

  const [isDragging, setIsDragging] = useState(false)

  function pickFile(selected: File | undefined) {
    if (!selected) return
    setValue('file', selected, { shouldValidate: true })
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    pickFile(event.target.files?.[0])
    // Allow choosing the same file again after removing it.
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    pickFile(event.dataTransfer.files?.[0])
  }

  const onSubmit = handleSubmit(({ file }) => start(file))

  function startOver() {
    resetField('file')
    reset()
  }

  const fileName = sourceFile?.name ?? validFile?.name ?? ''

  return (
    <main className="min-h-screen px-4 py-10 text-ink sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <PageHeader
              title="Kenetic Video Subtitle Translator"
              description="Upload a video and we'll transcribe the speech and add the subtitles directly onto it."
            />
          </div>
          <ThemeToggle />
        </header>

        <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          {/* IDLE */}
          {phase === 'idle' && (
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              {!validFile ? (
                <label
                  htmlFor="video-input"
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-surface ${
                    isDragging ? 'border-brand bg-brand/10' : 'border-line hover:border-brand'
                  }`}
                >
                  <Upload className="mb-3 h-10 w-10 text-muted" strokeWidth={1.5} />
                  <span className="font-medium">Choose a video or drag it here</span>
                  <span className="mt-1 text-sm text-muted">
                    MP4, MOV, MKV or WebM, up to {MAX_SIZE_MB} MB
                  </span>
                  <input
                    id="video-input"
                    type="file"
                    accept={ALLOWED_EXTENSIONS.join(',')}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-4 rounded-xl border border-line p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
                    <FileVideo className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{validFile.name}</p>
                    <p className="text-sm text-muted">{formatSize(validFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetField('file')}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Remove
                  </button>
                </div>
              )}

              {errors.file?.message && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
                >
                  {errors.file.message}
                </p>
              )}

              <button
                type="submit"
                disabled={!validFile}
                className={`${primaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand`}
              >
                Add subtitles
              </button>
            </form>
          )}

          {/* UPLOADING / PROCESSING */}
          {(phase === 'uploading' || phase === 'processing') && (
            <div aria-live="polite">
              <div className="mb-6 flex items-center gap-3">
                <Spinner />
                <div className="min-w-0">
                  <p className="font-medium">Processing your video</p>
                  <p className="truncate text-sm text-muted">{fileName}</p>
                </div>
              </div>

              <ol className="space-y-3">
                <StepRow
                  label="Uploading video"
                  detail={phase === 'uploading' ? `${uploadProgress}%` : undefined}
                  state={phase === 'uploading' ? 'active' : 'done'}
                />
                <StepRow
                  label="Creating subtitles and adding them to the video"
                  state={phase === 'processing' ? 'active' : 'pending'}
                />
              </ol>

              {phase === 'uploading' && (
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadProgress}
                  aria-label="Upload progress"
                  className="mt-4 h-2 overflow-hidden rounded-full bg-line"
                >
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <p className="mt-5 text-sm text-muted">
                Longer videos can take several minutes. Keep this page open.
              </p>

              <button type="button" onClick={cancel} className={`${secondaryButtonClass} mt-5`}>
                Cancel
              </button>
            </div>
          )}

          {/* DONE */}
          {phase === 'done' && result && (
            <div className="text-center" aria-live="polite">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="font-display text-xl font-semibold">Your video is ready</h2>
              <p className="mt-1 text-muted">
                Subtitles have been added to <span className="font-medium text-ink">{fileName}</span>{' '}
                ({formatSize(result.size)}).
              </p>

              <video
                src={result.url}
                controls
                className="mt-5 max-h-72 w-full rounded-xl bg-black"
              />

              <a
                href={result.url}
                download={subtitledName(fileName)}
                className={`${primaryButtonClass} mt-5 w-full gap-2`}
              >
                <Download className="h-5 w-5" />
                Download video
              </a>

              <button type="button" onClick={startOver} className={`${secondaryButtonClass} mt-3`}>
                Process another video
              </button>
            </div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <div className="text-center" role="alert">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                <CircleAlert className="h-7 w-7" />
              </div>
              <h2 className="font-display text-xl font-semibold">We couldn't process this video</h2>
              <p className="mt-1 text-muted">{errorMessage ?? 'Something went wrong. Try again.'}</p>

              {sourceFile && (
                <button
                  type="button"
                  onClick={() => start(sourceFile)}
                  className={`${primaryButtonClass} mt-6 w-full`}
                >
                  Try again
                </button>
              )}
              <button type="button" onClick={startOver} className={`${secondaryButtonClass} mt-3`}>
                Choose another video
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
