---
inclusion: fileMatch
fileMatchPattern: "**/*.{ts,tsx,css}"
---

# Conventions — Reliquary

## Naming

- Domain words over generic words. `CatalogueCard`, not `Item`. `LedgerEntry`, not `Row`.
- A legacy source is a `Source`. Its normalised output is a `Record`. The import
  result is a `ResurrectionReport`.
- Files: `kebab-case.ts`. Components: `PascalCase.tsx`.

## Types

Every adapter implements:

```ts
export interface LegacySource<T> {
  /** Total rows the source believes it contains. */
  count(): Promise<number>
  /** Yield rows in source order. Must be restartable and side-effect free. */
  scan(): AsyncIterable<RawRow>
  /** Map one raw row to a domain record, or explain the rejection. */
  normalise(raw: RawRow): Normalised<T> | Rejected
}
```

`Normalised` carries `{ record, mappedFields, unmappedFields }`.
`Rejected` carries `{ sourceRef, reason }` and is never silently discarded.

## Style

- Functions over classes unless state is genuinely needed.
- Prefer `Result`-shaped returns over thrown exceptions in the import pipeline.
  Exceptions are for programmer error, not bad data.
- Comments explain *why*. A comment that restates the code gets deleted.
- No barrel files that re-export half the package; import from the module.

## UI

- Three screens per app: **Search**, **Record**, **Report**.
- Every state change that a judge might want to link to lives in the URL.
- Empty states are designed, not accidental.
- Motion: at most one transition per interaction, 150–250ms, and it must respect
  `prefers-reduced-motion`.
- Colour, type and spacing come from tokens in `packages/reliquary/src/ui/theme.ts`.
  No raw hex values in components.
