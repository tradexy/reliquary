---
inclusion: fileMatch
fileMatchPattern: "**/*.{ts,tsx,css}"
---

# Conventions — Anchora

## Naming

- Domain words over generic words. `AuditEvent`, not `Row`. `Seal`, not `Signature`.
- An entry is an **event**; its position is a **seq**; its digest is a **hash**.
- Files: `kebab-case.ts`. Components: `PascalCase.tsx`.
- Finding codes are SCREAMING_SNAKE and stable: `HASH_MISMATCH`, `LINK_BROKEN`,
  `SEQ_GAP`, `SEAL_INVALID`, `ANCHOR_MISMATCH`, `ANCHOR_MISSING`, `LAWFUL_CHANGE`,
  `VERSION_UNSUPPORTED`. Never rename one; add a new code instead.

## The record

```ts
interface AuditEvent {
  seq: number
  at: string
  actor: { id: string; role: string }
  action: string        // must exist in the catalogue
  subject: string
  outcome: 'committed' | 'refused' | 'queued'
  lawful: 'none' | 'erasure' | 'retention' | 'payload-stripped'
  detail: Record<string, string | number | boolean | null>
  prevHash: string
  hash: string
}
```

`seq`, `prevHash` and `hash` are computed by `append()` and never supplied by a caller.
Returned events are frozen. `detail` holds values only — never nested functions, dates or
bigints, because canonical serialisation rejects them.

## Style

- Functions over classes unless state is genuinely needed.
- Prefer `Result`-shaped returns over thrown exceptions in the capture path. Exceptions
  are for programmer error, not for a failed audit write.
- Comments explain *why*. A comment that restates the code gets deleted.
- No barrel files that re-export half the package; import from the module.
- No `Date.now()` or `Math.random()` in the core. Time and entropy are injected so tests
  are reproducible.

## Crypto

- All hashing and signing lives in `packages/core/src/crypto`. Nowhere else.
- Canonical serialisation is one function with one format version. Changing it changes
  every hash ever produced, so it needs its own tests and a version bump.
- Never log a private key, and never pass one to a component.

## UI

- Screens: **Start here**, then the app's own screens. Start here is always first.
- Every state a judge might link to lives in the URL (query or hash).
- Empty states are designed, not accidental.
- Motion: at most one transition per interaction, 150–250ms, respecting
  `prefers-reduced-motion`.
- Colour, type and spacing come from tokens in `packages/core/src/ui/theme.ts`. No raw hex
  values in components.
- Anything simulated carries a `simulated` badge and a line in `docs/limits.md`.
