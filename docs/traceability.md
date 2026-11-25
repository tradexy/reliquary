# Requirements traceability

Every requirement in `.kiro/specs/anchora-evidence/requirements.md`, mapped to the
tests that would fail if it stopped being true.

| Req | Statement | Tests | Status |
| --- | --- | --- | --- |
| 1 | One chain format for every evidence type | `chain/append.test.ts`, `capture/catalogue.test.ts` | Covered |
| 2 | The hash covers everything that matters | `crypto/canonical.test.ts`, `crypto/hash.test.ts` | Covered |
| 3 | Edit, delete, insert and reorder are detectable | `chain/verify.test.ts` (truth table + PBT), `chain/bundle.test.ts` | Covered |
| 4 | Appends are one ordered operation | `chain/append.test.ts` (concurrent appends, frozen events) | Covered |
| 5 | Signed chain heads, key outside the data | `chain/seal.test.ts`, `chain/bundle.test.ts` | Covered |
| 6 | Anchors in create-only storage | `chain/anchor.test.ts` (`wx` refusal, original bytes intact) | Covered |
| 7 | Verification is a runnable artefact | `tools/verify/verify.test.ts`, `tools/mcp/mcp.test.ts` (clean pass, doctored fail, MCP) | Covered |
| 8 | Scheduled verification and alerting | Covered in part: verification state and control states exist; there is no scheduler or pager | **Partial** |
| 9 | Lawful change classified, not concealed | `chain/verify.test.ts`, `chain/bundle.test.ts` (144, 288, 401) | Covered |
| 10 | Capture is fail-closed where it must be | `capture/writers.test.ts`, `apps/witness` drill tests | Covered |
| 11 | Coverage visible and enforced | `capture/catalogue.test.ts` (guard test), Witness coverage matrix | Covered |
| 12 | Evidence traces to records | `evidence/evidence.test.ts`, Witness export-then-verify & Seal deep-link tests | Covered |
| 13 | Two apps, one core | `apps/seal/App.test.tsx`, `apps/witness/App.test.tsx`; `docs/skeleton-guide.md` | Covered |
| 14 | Honest claims | `docs/limits.md`, `simulated` badges, `security:check` blocks "tamper-proof" in UI/site | Covered |
| 15 | Runs sealed | System fonts, `connect-src 'none'` CSP in both apps + landing page, `security:check` blocks external font/CDN URLs | Covered |

## Honest gaps

- **Requirement 8 is partial.** The control states and the tamper-evident alert state
  exist; the scheduled job and the pager do not. Said plainly here rather than implied
  by a green tick.
- **Requirement 14 & 15 automated checks.** `scripts/security-check.mjs` now scans
  `packages/`, `apps/`, `tools/`, and `site/` to fail the build on `"tamper-proof"`
  overclaims and external font/CDN URLs; `"immutable"` nuance and CSP headers are
  checked by review and Vitest theme tests.

## Re-running the evidence

```bash
npm run verify                                   # typecheck + security scan + full Vitest suite
npm run test:pbt                                 # property-based suite at 1,000 runs
npm run verify:bundle -- packages/core/data/bundle.json
npm run verify:bundle -- packages/core/data/kiro-audit.bundle.json
```
