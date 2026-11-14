// Global test setup for the Reliquary monorepo.
// fast-check is configured here so the PBT_RUNS env var is honoured
// consistently across every suite — set seed and num runs once, not per file.
import { configureGlobal } from 'fast-check'

const runs = parseInt(process.env['PBT_RUNS'] ?? '100', 10)

configureGlobal({
  numRuns: runs,
  // Deterministic seed so a CI failure is reproducible by re-running with the
  // same seed logged in the output.
  seed: 42,
})
