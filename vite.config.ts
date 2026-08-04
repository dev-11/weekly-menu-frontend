import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Not VITE_-prefixed on purpose — read here in Node for the dev-server
  // proxy only, never bundled into client code.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    server: {
      // Dev-only same-origin proxy to the real API — the browser only ever
      // sees http://localhost:5180/api/..., so local dev needs no CORS at all.
      // Only affects `vite dev`; the production build still calls the real
      // absolute URL directly (see VITE_API_BASE_URL in CI).
      proxy: env.API_PROXY_TARGET
        ? {
            '/api': {
              target: env.API_PROXY_TARGET,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },
  }
})
