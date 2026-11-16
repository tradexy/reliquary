import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  // Relative base so the build works from any subdirectory (GitHub Pages).
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@reliquary/kit/contract': resolve(__dirname, '../../packages/reliquary/src/contract/index.ts'),
      '@reliquary/kit/import': resolve(__dirname, '../../packages/reliquary/src/import/index.ts'),
      '@reliquary/kit/repository': resolve(__dirname, '../../packages/reliquary/src/repository/index.ts'),
      '@reliquary/kit/ui': resolve(__dirname, '../../packages/reliquary/src/ui/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
