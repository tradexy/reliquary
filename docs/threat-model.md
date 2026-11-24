# Threat model

Scope: the evidence core, both static apps and the offline verifier. Out of scope: the
developer's machine, the GitHub account, Kiro itself.

## Assets

| Asset | Why it matters |
| --- | --- |
| The event chain | The only record of what the platform did. |
| Seals and anchors | They are what makes a rewritten chain detectable. |
| The signing key | Whoever holds it can mint seals; it must not sit beside the data. |
| The evidence export | The artefact an auditor takes away and checks. |
| The verifier | If it is wrong, everything else is theatre. |

## Threats

| # | Threat | Vector | Control | Verified by |
| --- | --- | --- | --- | --- |
| T1 | Row edited | Direct database or file edit | Recompute hash over canonical preimage; report at that seq | `chain/verify.test.ts`, bundle test at 217 |
| T2 | Row deleted | Removal of an entry | Sequence gap plus broken link at the next event | `chain/verify.test.ts` |
| T3 | Row inserted or reordered | Re-hash a new row into place | `prevHash` is in the preimage, so the link breaks | `chain/verify.test.ts` |
| T4 | Whole chain rewritten | Recompute every hash consistently | Seal signature fails; anchors no longer match the head | `chain/seal.test.ts`, `chain/anchor.test.ts` |
| T5 | Anchor overwritten | Write to an existing anchor key | Create-only write (`wx`) refuses; collision reported, never overwritten | `chain/anchor.test.ts` |
| T6 | Lawful change abused | Mark a tampered row as erasure | Classification requires a marker **and** an authority; unmarked change is tampering | `chain/bundle.test.ts` (144/288/401) |
| T7 | Silent capture gap | A widening action commits with no event | Fail-closed writer refuses; coverage matrix counts gaps; build guard fails on an untested action | `capture/writers.test.ts`, `catalogue.test.ts` |
| T8 | Export tampered | Edit the bundle after export | CLI recomputes every hash, link, seal and anchor; exits non-zero | `tools/verify/verify.test.ts` |
| T9 | Version confusion | Mix a v2 bundle with a v1 verifier | `FORMAT_VERSION` mismatch is a finding, never a pass | `chain/verify.test.ts` |
| T10 | XSS via event text | Markup in subject or detail | No HTML sinks; text rendered as text; CSP `connect-src 'none'` | `scripts/security-check.mjs` |
| T11 | Credential leak | Key committed to source | Static scan for key shapes; demo private key derived, never committed | `security:check` |
| T12 | Operator silences alerts | Turn off verification | Control state derives from the signed log, not app settings | Witness control states (partial) |
| T13 | Supply-chain change | A malicious dependency | Small pinned set, lockfile, no new dependency without justification | review |

## Residual risk

- **Key plus anchor compromise.** An attacker holding the signing key *and* the ability
  to delete the anchor store can rewrite history undetectably. That is why the real
  controls are KMS/HSM custody and an anchor account the operators do not control. In
  this build both are simulated and badged.
- **Verifier correctness.** A bug in canonical serialisation or in the verifier produces
  false assurance. Unit and property tests reduce this; they do not eliminate it. An
  independent review is required before production.
- **No scheduler.** Verification runs on demand and on load, not nightly; a missed run is
  not currently escalated.
- **No penetration test, no SBOM, no dependency audit pipeline.**
- **Static apps only.** No server means no auth, no rate limiting and no audit of the
  verifier's own use.

## What would change in production

KMS-backed keys with rotation alerts; S3 Object Lock in compliance mode, in a separate
account; append-only database grants with a required test on every migration; a nightly
scheduled verifier that pages from tamper-evident state; real-cloud parity tests before
any store is called supported.
