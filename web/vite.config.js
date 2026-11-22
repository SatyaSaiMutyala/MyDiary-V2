import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // In dev the app calls `/api/...` and Vite forwards it to the backend (Backend/: `npm run dev`).
  // The backend's port comes from Backend/.env (PORT). If you ever run it on another port, put
  // VITE_API_PORT=<that port> in web/.env.local — otherwise a mismatch shows up as "502 Bad Gateway".
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.VITE_API_PORT || '4000'
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          // Say plainly that the API is not running, instead of a bare 502 from the proxy.
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (!res || res.headersSent || typeof res.writeHead !== 'function') return
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(
                JSON.stringify({
                  error: {
                    message: `Cannot reach the MyDiary API on port ${apiPort}. Start it with: cd Backend && npm run dev`,
                    code: 'api_unreachable',
                  },
                }),
              )
            })
          },
        },
      },
    },
  }
})
