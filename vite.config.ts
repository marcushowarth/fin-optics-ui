import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker'

// Build metadata, injected as compile-time constants (see src/globals.d.ts).
// GIT_SHA is set by the deploy workflow; 'dev' locally.
const uiVersion = process.env.GIT_SHA || 'dev'
const builtAt = new Date().toISOString()

export default defineConfig({
  // Surface vue-tsc type errors live in the dev server (esbuild alone doesn't
  // type-check). enableBuild:false — `npm run build` already runs vue-tsc -b.
  plugins: [vue(), checker({ vueTsc: true, enableBuild: false })],
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
