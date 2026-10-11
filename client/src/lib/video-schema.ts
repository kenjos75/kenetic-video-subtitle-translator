import { z } from 'zod'
import { ALLOWED_EXTENSIONS, MAX_SIZE_MB } from '@/constants'

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

// Mirrors the checks in the FastAPI endpoint so users get instant feedback.
export const videoFormSchema = z.object({
  file: z
    .instanceof(File, { message: 'Choose a video to continue.' })
    .refine((f) => f.size > 0, 'This file is empty.')
    .refine(
      (f) => (ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(f.name)),
      `Unsupported format. Use ${ALLOWED_EXTENSIONS.join(', ')}.`,
    )
    .refine(
      (f) => f.size <= MAX_SIZE_MB * 1024 * 1024,
      `This file is larger than ${MAX_SIZE_MB} MB.`,
    ),
})

export type VideoFormValues = z.infer<typeof videoFormSchema>

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function subtitledName(original: string): string {
  const dot = original.lastIndexOf('.')
  const base = dot > 0 ? original.slice(0, dot) : original
  return `${base}-subtitled.mp4`
}
