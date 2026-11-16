# Tasks — Reliquary Kit

Ordered so that each task leaves the repo runnable. Implementation is done by
Kiro; each task should be one spec execution, not one prompt.

- [x] 1. Workspace scaffold
  - [x] 1.1 Root `package.json` with npm workspaces and scripts (`dev:*`, `test`, `build`)
  - [x] 1.2 `tsconfig.base.json` with `strict: true`
  - [x] 1.3 `packages/reliquary` package with `src/` folders from the design
  - [x] 1.4 Vitest + fast-check configured

- [x] 2. Contract
  - [x] 2.1 `contract/types.ts` — `LegacySource`, `RawRow`, `Normalised`, `Rejected`, `FieldMapping`
  - [x] 2.2 `contract/validate.ts` — runtime guard for adapter conformance
  - [x] 2.3 Unit tests for the guard

- [x] 3. Import pipeline
  - [x] 3.1 `import/pipeline.ts` — count, scan, normalise, reconcile
  - [x] 3.2 `import/report.ts` — build report, compute `status`
  - [x] 3.3 `import/publish.ts` — refuses to publish an inconsistent report
  - [x] 3.4 Property-based suite covering Requirement 2 and Requirement 4

- [x] 4. Repository
  - [x] 4.1 `repository/memory.ts` — all, byId, search, report
  - [x] 4.2 Unit tests for search normalisation and empty query

- [x] 5. UI shell
  - [x] 5.1 `ui/theme.ts` — `Theme` type, `ossuary` and `foundry` presets
  - [x] 5.2 `ui/Search.tsx` — query in URL, result count, list
  - [x] 5.3 `ui/Record.tsx` — sections, provenance disclosure
  - [x] 5.4 `ui/Report.tsx` — reconciliation badge, mapping table, rejections
  - [x] 5.5 `ui/App.tsx` — routing between the three screens
  - [x] 5.6 Component tests for the inconsistent-report state

- [x] 6. Card Catalogue app
  - [x] 6.1 Source adapter over the card-index `.dbf`-style export
  - [x] 6.2 Sample dataset committed as JSON, with three deliberately broken rows
  - [x] 6.3 Vite app wiring the kit with `ossuary` theme
  - [x] 6.4 End-to-end manual pass: search, open, report
  - [x] 6.5 CSV export of the Resurrection Report, downloadable
  - [x] 6.6 Print stylesheet for a request slip

- [x] 7. Parts Ledger app
  - [x] 7.1 Second adapter over a dot-matrix stock ledger export
  - [x] 7.2 Different data shape: quantities, bin locations, discontinued parts
  - [x] 7.3 `foundry` theme, compact density
  - [x] 7.4 Confirm zero duplicate components with the first app
  - [x] 7.5 Stocktake screen: pick a bin range, confirm counts, record discrepancies
  - [x] 7.6 Printable stocktake sheet and CSV export

- [x] 8. Evidence
  - [x] 8.1 `docs/kiro-journal.md` updated per spec execution
  - [x] 8.2 Hooks: run tests on agent stop, contract tests on adapter edits
  - [x] 8.3 One MCP server used for a real task, documented
  - [x] 8.4 README "How Kiro was used" section written from the journal

## Parked until the machine is free

- `npm install`, `npm test`, `npm run build`, dev servers
- Deployment
- Video capture

## Definition of done

- Both apps run from a single documented command
- `npm test` green, including the property-based suite
- Report shows `lossless` for both datasets and `inconsistent` for the doctored one
- `.kiro/` present at repo root with steering, specs and hooks
