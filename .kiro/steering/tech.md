---
inclusion: always
---

# Tech steering — Reliquary

## Stack

- **TypeScript** everywhere, `strict: true`. No `any` in exported signatures.
- **React + Vite** for both apps. Client-side only; no server required to demo.
- **npm workspaces** monorepo: `packages/reliquary` (the kit), `apps/*`.
- **Vitest** for unit and property-based tests.
- **fast-check** for property-based testing.
- **Tailwind CSS** with a hand-authored design token layer. No component library.
- Data is bundled as static JSON at build time, produced by the import pipeline.

## Rules

1. `packages/reliquary` must not import from `apps/*`. Ever.
2. Apps extend the kit in exactly three ways: the adapter contract, a theme object,
   and additional screens composed from kit primitives. Forking or copying a kit
   component is not allowed — if an app needs different behaviour from a kit
   component, fix the kit so both apps benefit.
3. All data access goes through the `Repository` interface. Components never read
   JSON directly.
4. No `localStorage` for anything a judge would need to see. State is in the URL
   where it matters (search query, selected record).
5. Build output must work from a static host. No server-side rendering.

## Property-based testing

The adapter contract is the place PBT earns its keep. At minimum:

- `scan()` yields exactly `count()` items.
- Every yielded record survives `normalise()` with its source identifier intact.
- No two records share an identifier after normalisation.
- The report's `in` count equals `out` count plus rejected count.

These are invariants, not examples. If a change makes one of them unprovable in a
single sentence, the change is too clever.

## Commands

```bash
npm test           # all tests
npm run test:pbt   # property-based suite, more runs
npm run dev:cards  # Card Catalogue
npm run dev:parts  # Parts Ledger
npm run build      # builds both apps
```
