import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { GET as waqiProxy } from './api/waqi.js'

/**
 * `vite dev` has no serverless runtime, so serve /api/waqi from the same
 * handler Vercel deploys. Keeps local and production behaviour identical.
 */
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/waqi', async (req, res) => {
        const response = await waqiProxy(new Request(`http://localhost${req.originalUrl}`, { headers: req.headers }))
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.end(await response.text())
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' loads every variable, not just VITE_ ones. WAQI_TOKEN stays server-side:
  // it is read by the proxy, and only a has-token boolean reaches the bundle.
  const env = loadEnv(mode, process.cwd(), '')
  process.env.WAQI_TOKEN ??= env.WAQI_TOKEN

  return {
    plugins: [react(), tailwindcss(), devApi()],
    define: {
      'import.meta.env.VITE_WAQI_IS_DEMO': JSON.stringify(String(!env.WAQI_TOKEN)),
    },
  }
})
