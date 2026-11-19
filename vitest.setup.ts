// Global test setup for the Reliquary monorepo.
// fast-check is configured here so the PBT_RUNS env var is honoured
// consistently across every suite — set seed and num runs once, not per file.
import { configureGlobal } from 'fast-check'

// Register @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
import '@testing-library/jest-dom'

// jsdom does not implement window.matchMedia. Stub it so components that read
// prefers-reduced-motion work in tests without crashing.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},       // deprecated but some libs still call it
    removeListener: () => {},    // deprecated but some libs still call it
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

const runs = parseInt(process.env['PBT_RUNS'] ?? '100', 10)

configureGlobal({
  numRuns: runs,
  // Deterministic seed so a CI failure is reproducible by re-running with the
  // same seed logged in the output.
  seed: 42,
})

// jsdom does not expose WebCrypto's subtle API, and Node 20's global crypto may
// be partial. The core hashes and signs with crypto.subtle, so tests need a real
// implementation regardless of environment.
import { webcrypto } from 'node:crypto'

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
    writable: true,
  })
}
