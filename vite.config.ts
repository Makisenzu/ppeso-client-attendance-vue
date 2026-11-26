import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    // Loaded only when an admin exports ANNEX D (dynamic import). Pre-bundle it at startup so the dev server
    // doesn't discover it on the first click, re-optimize, and break the import with a stale `?v=` hash.
    include: ['jszip'],
  },
})
