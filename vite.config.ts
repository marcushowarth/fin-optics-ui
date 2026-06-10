import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Build metadata, injected as compile-time constants (see src/globals.d.ts).
// GIT_SHA is set by the deploy workflow; 'dev' locally.
const uiVersion = process.env.GIT_SHA || 'dev'
const builtAt = new Date().toISOString()

export default defineConfig({
  plugins: [vue()],
  define: {
    __UI_VERSION__: JSON.stringify(uiVersion),
    __UI_BUILT_AT__: JSON.stringify(builtAt),
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8090'
    }
  }
})
