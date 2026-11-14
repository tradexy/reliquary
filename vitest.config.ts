import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Run tests from all packages in a single vitest process.
    // Each package can also run vitest independently.
    include: [
      'packages/*/src/**/*.{test,spec}.{ts,tsx}',
      'apps/*/src/**/*.{test,spec}.{ts,tsx}',
    ],
    environment: 'jsdom',
    globals: true,
    // PBT_RUNS env var controls property-based test run count (default 100).
    // Set to 1000 via `npm run test:pbt`.
    setupFiles: ['./vitest.setup.ts'],
  },
})
