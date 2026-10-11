// Relative on purpose: in dev, Vite proxies /api to the FastAPI server
// (see vite.config.ts), so the browser never makes a cross-origin request
// and the backend does not need CORS.
export const API_BASE = '/api'
export const PROCESS_ENDPOINT = `${API_BASE}/process`

export const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.webm'] as const
export const MAX_SIZE_MB = 500
