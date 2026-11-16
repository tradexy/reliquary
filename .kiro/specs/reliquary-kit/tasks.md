# Tasks — Reliquary Kit

Ordered so that each task leaves the repo runnable. Implementation is done by
Kiro; each task should be one spec execution, not one prompt.

- [ ] 1. Workspace scaffold
  - [ ] 1.1 Root `package.json` with npm workspaces and scripts (`dev:*`, `test`, `build`)
  - [ ] 1.2 `tsconfig.base.json` with `strict: true`
  - [ ] 1.3 `packages/reliquary` package with `src/` folders from the design
  - [ ] 1.4 Vitest + fast-check configured

- [ ] 2. Contract
  - [ ] 2.1 `contract/types.ts` — `LegacySource`, `RawRow`, `Normalised`, `Rejected`, `FieldMapping`
  - [ ] 2.2 `contract/validate.ts` — runtime guard for adapter conformance
  - [ ] 2.3 Unit tests for the guard

- [ ] 3. Import pipeline
  - [ ] 3.1 `import/pipeline.ts` — count, scan, normalise, reconcile
  - [ ] 3.2 `import/report.ts` — build report, compute `status`
  - [ ] 3.3 `import/publish.ts` — refuses to publish an inconsistent report
  - [ ] 3.4 Property-based suite covering Requirement 2 and Requirement 4

- [ ] 4. Repository
  - [ ] 4.1 `repository/memory.ts` — all, byId, search, report
  - [ ] 4.2 Unit tests for search normalisation and empty query

- [ ] 5. UI shell
  - [ ] 5.1 `ui/theme.ts` — `Theme` type, `ossuary` and `foundry` presets
  - [ ] 5.2 `ui/Search.tsx` — query in URL, result count, list
  - [ ] 5.3 `ui/Record.tsx` — sections, provenance disclosure
  - [ ] 5.4 `ui/Report.tsx` — reconciliation badge, mapping table, rejections
  - [ ] 5.5 `ui/App.tsx` — routing between the three screens
  - [ ] 5.6 Component tests for the inconsistent-report state

- [ ] 6. Card Catalogue app
  - [ ] 6.1 Source adapter over the card-index `.dbf`-style export
  - [ ] 6.2 Sample dataset committed as JSON, with three deliberately broken rows
  - [ ] 6.3 Vite app wiring the kit with `ossuary` theme
  - [ ] 6.4 End-to-end manual pass: search, open, report
  - [ ] 6.5 CSV export of the Resurrection Report, downloadable
  - [ ] 6.6 Print stylesheet for a request slip

- [ ] 7. Parts Ledger app
  - [ ] 7.1 Second adapter over a dot-matrix stock ledger export
  - [ ] 7.2 Different data shape: quantities, bin locations, discontinued parts
  - [ ] 7.3 `foundry` theme, compact density
  - [ ] 7.4 Confirm zero duplicate components with the first app
  - [ ] 7.5 Stocktake screen: pick a bin range, confirm counts, record discrepancies
  - [ ] 7.6 Printable stocktake sheet and CSV export

- [ ] 8. Evidence
  - [ ] 8.1 `docs/kiro-journal.md` updated per spec execution
  - [ ] 8.2 Hooks: run tests on agent stop, contract tests on adapter edits
  - [ ] 8.3 One MCP server used for a real task, documented
  - [ ] 8.4 README "How Kiro was used" section written from the journal

## Parked until the machine is free

- `npm install`, `npm test`, `npm run build`, dev servers
- Deployment
- Video capture

## Definition of done

- Both apps run from a single documented command
- `npm test` green, including the property-based suite
- Report shows `lossless` for both datasets and `inconsistent` for the doctored one
- `.kiro/` present at repo root with steering, specs and hooks
