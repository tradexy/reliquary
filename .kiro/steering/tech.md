---
inclusion: always
---

# Tech steering — Anchora

## Stack

- **TypeScript**, `strict: true`, no `any` in exported signatures.
- **npm workspaces**: `packages/core` (evidence core), `apps/seal`, `apps/witness`.
- **React + Vite** for both apps, client-side only, no server at runtime.
- **Vitest + fast-check** for unit and property-based tests.
- **@noble/ed25519** for signatures — small, audited, no native build, works offline.
- **WebCrypto SHA-256** for hashing, with a pure-JS fallback for Node and CI.
- **Tailwind-free**: hand-authored design tokens, inline styles through CSS custom
  properties, as in the previous build.

## Rules

1. `packages/core` must not import from `apps/*`.
2. Apps extend the core only through: the event catalogue, a theme object, and
   additional screens composed from core components.
3. **All cryptographic code lives in `packages/core/src/crypto`.** No hashing or
   signing anywhere else. No hand-rolled curve arithmetic.
4. **Deterministic by default.** No `Date.now()` or `Math.random()` inside the core;
   time and entropy are injected. Tests must be reproducible from a seed.
5. **Canonical serialisation is a single function.** Any change to it invalidates
   every hash ever produced, so it has its own test suite and a version tag.
6. The verifier must never trust its input: every field is parsed defensively and
   every count is recomputed.
7. Anything simulated (key custody, object lock) is marked in the UI with a
   `simulated` badge and documented in `docs/limits.md`.

## Property-based testing

The invariants worth generating over:

- Appending any event preserves the chain: `hash(n)` depends on `hash(n-1)`.
- Editing any single field of any event makes verification fail at that index.
- Deleting any event creates a sequence gap or a broken link, never silence.
- Reordering two events is detected.
- A lawful change (erasure/retention/strip) verifies as lawful, not as tampering.
- Seals verify only with the matching public key; a wrong key fails every seal.

## Commands

```bash
npm run verify        # typecheck + security scan + tests
npm run test:pbt      # property-based suite at 1,000 runs
npm run dev:seal
npm run dev:witness
npm run verify:bundle -- ./exports/demo.bundle.json   # offline verifier CLI
```
