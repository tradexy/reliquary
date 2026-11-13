# Design — Reliquary Kit

## Architecture

```
apps/card-catalogue ─┐
                     ├─→ packages/reliquary
apps/parts-ledger ───┘        │
                              ├── contract/     LegacySource, Normalised, Rejected
                              ├── import/       pipeline + ResurrectionReport
                              ├── repository/   in-memory Repository over imported data
                              └── ui/           Search, Record, Report, theme tokens
```

One direction of dependency only. The kit knows nothing about either app.

## The contract

```ts
export interface LegacySource<T> {
  count(): Promise<number>
  scan(): AsyncIterable<RawRow>
  normalise(raw: RawRow): Normalised<T> | Rejected
}

export type RawRow = Readonly<Record<string, string | number | null>>

export interface Normalised<T> {
  kind: 'normalised'
  record: T
  mappedFields: FieldMapping[]
  unmappedFields: string[]
  synthesisedFields: Array<{ field: string; value: unknown }>
}

export interface Rejected {
  kind: 'rejected'
  sourceRef: string
  reason: string
}
```

`sourceRef` is the only identifying contract between a source and a rejection.
Everything a user sees about a rejected row comes from it.

## The report

```ts
export interface ResurrectionReport {
  sourceName: string
  importedAt: string
  rowsIn: number
  rowsOut: number
  rejected: Rejected[]
  fieldMappings: FieldMapping[]
  unmappedFields: string[]
  synthesisedFields: string[]
  status: 'lossless' | 'inconsistent'
}
```

`status` is computed, never set by hand:

```
lossless  ⇔  rowsIn === rowsOut + rejected.length
```

If the equation fails, `status = 'inconsistent'` and `publish()` throws. A failed
reconciliation must be impossible to ignore in the UI.

## Import pipeline

1. `source.count()` → `rowsIn`
2. For each `source.scan()` row → `normalise()`
3. Normalised → push record; Rejected → push rejection
4. Compute field mapping from the union of all rows
5. Verify reconciliation
6. Return report + records; caller decides whether to publish

The pipeline is a pure function over an async iterable. No I/O, no clock except
`importedAt` injected as a parameter, so tests are deterministic.

## Repository

```ts
export interface Repository<T> {
  all(): readonly T[]
  byId(id: string): T | undefined
  search(query: string): readonly T[]
  report(): ResurrectionReport
}
```

Search is a linear scan over pre-computed lowercase keys. At 2,000–5,000 records
this is fast enough and removes any index-building code from the template.

## UI

Three screens, one component per screen, driven by a small route object:

| Screen | URL | Content |
| --- | --- | --- |
| Search | `/` with `?q=` | query input, result count, result list |
| Record | `/?id=<id>` | record fields, provenance disclosure |
| Report | `/report` | counts, reconciliation badge, field table, rejections |

The shell takes:

```ts
interface AppConfig<T> {
  title: string
  subtitle: string
  searchFields: Array<keyof T & string>
  renderRecord(record: T): RecordSection[]
  theme: Theme
}
```

`renderRecord` returns sections of label/value pairs, so the kit never knows what
a catalogue card or a ledger entry is.

## Theme

Single exported token object, consumed as CSS custom properties injected once at
the root. Apps supply tokens only; they never override component CSS.

```ts
interface Theme {
  name: string
  colors: { bg, surface, ink, muted, accent, danger, bone }
  type: { display, body, mono }
  radius: string
  density: 'comfortable' | 'compact'
}
```

Two shipped presets: `ossuary` (Card Catalogue, deep green and bone) and
`foundry` (Parts Ledger, rust and soot). Same components, visibly different
products.

## Testing

- **Unit:** pipeline reconciliation, report shape, search matching.
- **Property-based (fast-check):**
  - `scan()` length equals `count()` for any generated source.
  - Every normalised record keeps its `sourceRef` identity.
  - Identifiers are unique after normalisation.
  - `rowsIn === rowsOut + rejected.length` for any generated mix of valid and
    broken rows, including all-broken and empty sources.
- **Component:** Search filters, Record renders provenance, Report shows
  `inconsistent` state when given a doctored report.

The PBT suite is the point: it tests the promise, not the implementation.

## Deployment

Both apps build to static assets and deploy to Cloudflare Pages or GitHub Pages.
A prebuilt JSON dataset is committed under `apps/*/data/` so the deployed app
needs no pipeline at request time.

## Decisions and trade-offs

| Decision | Why |
| --- | --- |
| Three-method contract, not two | `normalise` is unavoidable; forcing it into `scan` hides the mapping and loses the report. |
| Static JSON, not a database | Removes auth, hosting and migration risk from a 3-week build. |
| Linear search | Correct first; 5,000 records is nothing. |
| No AI feature in the kit | The hackathon rewards Kiro usage in the *build*, not AI in the product. A bolted-on chat would weaken the concept. |
| URL-driven state | Judges can link to a record; screenshots become reproducible. |
