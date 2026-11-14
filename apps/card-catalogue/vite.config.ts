import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allow the app to import kit sub-paths without node_modules resolution
      // issues during development before `npm install` runs.
      '@reliquary/kit/contract': resolve(__dirname, '../../packages/reliquary/src/contract/index.ts'),
      '@reliquary/kit/import': resolve(__dirname, '../../packages/reliquary/src/import/index.ts'),
      '@reliquary/kit/repository': resolve(__dirname, '../../packages/reliquary/src/repository/index.ts'),
      '@reliquary/kit/ui': resolve(__dirname, '../../packages/reliquary/src/ui/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    // Static export — no server required.
    emptyOutDir: true,
  },
})
