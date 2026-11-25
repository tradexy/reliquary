# Extending the Anchora Skeleton

To build a new regulated domain application on `@anchora/core` (Skeleton Crew pattern):

1. **Extend the action catalogue** in `packages/core/src/capture/catalogue.ts` and add the corresponding `'widening' | 'tightening'` classification in `catalogue.test.ts` so the coverage guard enforces tests.
2. **Add domain compliance predicates** in `packages/core/src/evidence/standards.ts` mapping your controls to event queries.
3. **Compose a new app under `apps/<name>/`** importing `AppShell`, `Panel`, `Table`, `Badge`, `ControlPanel`, and a custom `Theme` from `@anchora/core/ui`.
4. **Never duplicate crypto or capture logic** inside `apps/*`; all hashing, signing, and capture runs through `@anchora/core`.
5. **Verify before stopping** with `npm run verify` and the `anchora` MCP server (`verify_bundle`, `check_coverage`).
