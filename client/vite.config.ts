import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// In Docker this is set to http://python-service-fastapi:8000 (see docker-compose.yml).
// Outside Docker it falls back to the backend on your own machine.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Listen on all interfaces so the browser can reach Vite through Docker's port mapping.
    host: true,
    proxy: {
      // The backend route is already /api/process, so the path is forwarded as-is.
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})