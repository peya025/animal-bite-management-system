import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // lenis is loaded via an import-map in public/landing.html pointing to a CDN URL.
  // Exclude it from pre-bundling so Vite does not try to resolve it from node_modules.
  optimizeDeps: {
    exclude: ['lenis'],
  },
})
