# Requirements traceability

Every requirement in `.kiro/specs/reliquary-kit/requirements.md`, mapped to the
tests that would fail if it stopped being true.

| Req | Statement (short) | Tests | Status |
| --- | --- | --- | --- |
| 1 | Adapter contract stays minimal | `packages/reliquary/src/contract/validate.test.ts` (13) | Covered |
| 2 | Every row accounted for | `packages/reliquary/src/import/pipeline.test.ts` (21), `pipeline.pbt.test.ts` (11) | Covered |
| 3 | Field mapping is visible | `pipeline.test.ts` — mapping dedup, unmapped, synthesised | Covered |
| 4 | Losslessness is a tested invariant | `pipeline.pbt.test.ts` — 4 properties | Covered |
| 5 | One shell, three screens | `packages/reliquary/src/ui/ui.test.tsx` (37) | Covered |
| 6 | Two apps prove versatility | `apps/card-catalogue/src/source/cardSource.test.ts`, `apps/parts-ledger/src/source/ledgerSource.test.ts` | Covered |
| 7 | Runs without ceremony | `npm run verify`, CI workflow on every push | Covered by CI |
| 8 | Accessibility baseline | Partial: aria roles and keyboard paths in `ui.test.tsx`; contrast and reduced-motion are manual | **Partial** |

## Honest gaps

- **Req 8 is not fully automated.** We test roles, labels and the presence of the
  reduced-motion hook, but contrast has not been measured with a tool. Claiming
  full WCAG 2.2 AA compliance would be false.
- **Req 7 is verified by the pipeline, not by a test file.** The deploy workflow
  runs `npm ci`, the suite and both builds on a clean Ubuntu runner, which is a
  stronger check than a local one.
- **Security properties are tracked in `docs/threat-model.md`**, not here, because
  they are not in the original requirements document. That spec was written before
  the security pass and should probably gain a requirement 9.

## How to re-run the evidence

```bash
npm run verify        # typecheck + static security scan + 201 tests
npm run test:pbt      # property-based suite at 1,000 runs
```
