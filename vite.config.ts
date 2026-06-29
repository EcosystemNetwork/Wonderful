import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Meshy's asset CDN (assets.meshy.ai) sends no CORS headers, so the
      // browser can't fetch generated .glb models directly. Proxy them through
      // the dev server so the fetch is same-origin. See toFetchableModelUrl()
      // in src/api/meshy.ts for the URL rewrite.
      '/meshy-cdn': {
        target: 'https://assets.meshy.ai',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/meshy-cdn/, ''),
      },
      // Claude Code Proxy (Anthropic format → Nebius) runs on :8083. The browser
      // can't reliably hit it cross-origin, so route in-game chat through the dev
      // server: same-origin to the page, forwarded to the proxy. See src/api/claude.ts.
      '/claude-proxy': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/claude-proxy/, ''),
      },
    },
  },
})
