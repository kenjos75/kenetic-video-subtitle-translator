import { PROCESS_ENDPOINT } from '@/constants'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export type ProcessedVideo = {
  /** Object URL for the subtitled video. Revoke it when you're done with it. */
  url: string
  size: number
}

type ProcessOptions = {
  signal?: AbortSignal
  /** Upload progress, 0 to 100. */
  onUploadProgress?: (percent: number) => void
}

// FastAPI errors look like { "detail": "..." }.
async function readErrorMessage(body: Blob, status: number): Promise<string> {
  try {
    const data = JSON.parse(await body.text()) as { detail?: unknown }
    if (typeof data.detail === 'string') return data.detail
  } catch {
    // Not JSON (for example a proxy error page); fall through.
  }
  if (status === 413) return 'The file is too large.'
  if (status === 502 || status === 504) return 'The server did not respond. Is the backend running?'
  return 'Something went wrong while processing the video.'
}

// XMLHttpRequest instead of fetch because fetch cannot report upload progress.
export function processVideo(file: File, options: ProcessOptions = {}): Promise<ProcessedVideo> {
  const { signal, onUploadProgress } = options

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const body = new FormData()
    body.append('file', file)

    xhr.open('POST', PROCESS_ENDPOINT)
    xhr.responseType = 'blob'

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onUploadProgress?.(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.upload.onload = () => onUploadProgress?.(100)

    xhr.onload = async () => {
      const blob = xhr.response as Blob
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ url: URL.createObjectURL(blob), size: blob.size })
        return
      }
      reject(new ApiError(await readErrorMessage(blob, xhr.status), xhr.status))
    }

    xhr.onerror = () =>
      reject(new ApiError('Could not reach the server. Check that the backend is running.', 0))
    xhr.onabort = () => reject(new DOMException('Cancelled', 'AbortError'))

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException('Cancelled', 'AbortError'))
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(body)
  })
}
