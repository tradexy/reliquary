import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'


// Content Security Policy, injected at build time only so the dev server keeps
// its HMR preamble. The apps make no network calls; fonts are the only external
// fetch, and they are restricted to Google Fonts.
const cspPlugin = {
  name: 'inject-csp',
  apply: 'build' as const,
  transformIndexHtml(html: string) {
    const policy = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      'font-src https://fonts.gstatic.com',
      "img-src 'self' data:",
      "connect-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "object-src 'none'",
    ].join('; ')
    return html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
    )
  },
}

export default defineConfig({
  // Relative base so the build works from any subdirectory (GitHub Pages).
  base: './',
  plugins: [react(), cspPlugin],
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
