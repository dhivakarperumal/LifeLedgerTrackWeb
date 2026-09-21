import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://localhost:5000/api'
  const liveBackendTarget = apiTarget.replace(/\/api\/?$/, '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: liveBackendTarget,
          changeOrigin: true,
          secure: true,
        },
        '/uploads': {
          target: liveBackendTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})

