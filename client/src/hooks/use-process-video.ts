import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { processVideo } from '@/api/process'

export type ProcessPhase = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export function useProcessVideo() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const mutation = useMutation({
    mutationFn: (file: File) => {
      const controller = new AbortController()
      controllerRef.current = controller
      setUploadProgress(0)
      return processVideo(file, {
        signal: controller.signal,
        onUploadProgress: setUploadProgress,
      })
    },
  })

  // Free the in-memory video when it is replaced, reset, or the page unmounts.
  const resultUrl = mutation.data?.url
  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [resultUrl])

  const { mutate, reset: resetMutation } = mutation

  const start = useCallback((file: File) => mutate(file), [mutate])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    resetMutation()
  }, [resetMutation])

  const reset = useCallback(() => {
    setUploadProgress(0)
    resetMutation()
  }, [resetMutation])

  let phase: ProcessPhase = 'idle'
  if (mutation.isPending) phase = uploadProgress < 100 ? 'uploading' : 'processing'
  else if (mutation.isSuccess) phase = 'done'
  else if (mutation.isError) phase = 'error'

  return {
    phase,
    uploadProgress,
    result: mutation.data,
    sourceFile: mutation.variables,
    errorMessage: mutation.error?.message ?? null,
    start,
    cancel,
    reset,
  }
}
