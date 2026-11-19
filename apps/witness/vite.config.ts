import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Content Security Policy, injected at build time only so the dev server keeps
// its HMR preamble. The app makes no network calls and loads no remote fonts
// (Requirement 15). 'unsafe-inline' for styles covers React style attributes and
// the shell's <style> element; scripts stay 'self' only.
const cspPlugin = {
  name: 'inject-csp',
  apply: 'build' as const,
  transformIndexHtml(html: string) {
    const policy = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
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
  // Relative base so the build works from any subdirectory.
  base: './',
  plugins: [react(), cspPlugin],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
