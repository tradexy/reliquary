# Anchora

**Every action is recorded, and every record is provably unchanged.**

Built for [Kiroween 2026](https://kiroween.devpost.com/) in the **Frankenstein**
category: cryptographic integrity and compliance capture, stitched into one audit
trail that an outsider can verify without trusting the operator.

| | |
| --- | --- |
| Live | https://tradexy.github.io/reliquary/ |
| Seal (integrity) | https://tradexy.github.io/reliquary/seal/ |
| Witness (capture) | https://tradexy.github.io/reliquary/witness/ |
| Licence | MIT |

---

## Why

A regulated deployment — a bank, a hospital group, a defence supplier — can put AI
agents behind its own data, but its auditor has to answer two questions that a
dashboard cannot:

1. **Has anything in the audit log been changed since it was written?**
2. **Did every action that should have left a record actually leave one?**

Integrity without capture proves that an incomplete record is unchanged. Capture
without integrity gives a complete record that anyone with database access can
rewrite. Both are needed for the claim above, and neither app can make it alone.

## The two apps

**Seal — proves nothing changed.** 500 events, hash-chained, sealed with Ed25519,
anchored to create-only storage. Press *Edit this record* and verification reports
`HASH_MISMATCH` at that exact seq, with a first-divergence index. Recomputing every
hash afterwards does not help: the anchored head was already written.

**Witness — proves nothing was missed.** 14 auditable actions, each classified as
fail-closed or queue. Flip the store to unavailable and a role grant is refused
(`audit-unavailable`) while a revoke completes and queues its record durably. The
coverage matrix carries a build guard: a catalogued action without a test is a gap.

## Verify it yourself

```bash
npm ci
npm run verify:bundle -- packages/core/data/bundle.json
```

```
  events      500
  seals       9
  anchors     4
  key         7f2d0c75f3608e2d2f9743ca688960c5
  INFO  seq  144  LAWFUL_CHANGE  lawful erasure authorised by dpo@northgate.example
  INFO  seq  288  LAWFUL_CHANGE  lawful retention authorised by retention-scheduler
  INFO  seq  401  LAWFUL_CHANGE  lawful payload-stripped authorised by ravi.menon
  result      PASS
  divergence  none
```

Edit one field of the bundle and the same command exits 1 with `divergence 217`.
That is the whole product in two lines.

## How it works

```
action ──same transaction──► AuditEvent { seq, prevHash, hash } ──► chain
                                        │
                                        ├── seal  = Ed25519({seq, hash, at, keyId})
                                        └── anchor = create-only write of the seal digest

verify(bundle, publicKey) → hashes, links, sequence, seal signatures, anchor digests
                          → classification: lawful change or tampering
                          → first divergence index
```

- `hash = sha256(canonical(event without hash))`, and `prevHash` is inside the
  preimage, so deletions and reorderings break the chain rather than merely looking odd.
- Canonical serialisation is one function with a format version. Change it and every
  hash changes, so bundles refuse to mix versions instead of passing falsely.
- Lawful change — erasure, retention, payload stripping — is recorded and reported as
  lawful, not hidden. The verifier distinguishes it from tampering by the marker and
  its authority.

## Layout

```
packages/core        evidence core: crypto, chain, capture, evidence, ui
apps/seal            integrity console
apps/witness         capture and compliance console
tools/verify         offline verifier CLI (no React, no network)
scripts              seeded evidence generator
.kiro                steering, specs, hooks
docs                 threat model, limits, traceability, demo plan, submission copy
```

## Run it

```bash
npm ci
npm run dev:seal        # http://localhost:5180
npm run dev:witness     # http://localhost:5181
npm run verify          # typecheck + security scan + tests
npm run generate:stream # regenerate the 500-event bundle (deterministic)
```

## How Kiro was used

Spec-first with **Kiro**: steering, then 15 EARS requirements, then design, then
tasks, then one scoped implementation run per task group.

- **Steering** fixed the promises before any code: "the verifier is the product",
  "never overstate", "lawful change is classified, not concealed".
- **Specs** (`.kiro/specs/anchora-evidence/`) carry the hash preimage, the anchor
  semantics, the verification algorithm and a traceability table.
- **Hooks** gate the work: `verify-on-stop` (typecheck + security scan + tests),
  `security-on-write`, and contract tests on adapter edits.
- **Kiro wrote** the canonical serialiser, hashing, keys, signing, the append log,
  the verifier, the capture writers, the evidence mapping, the shared UI and both
  apps. It also caught its own fast-check API error by running the suite.

What the human did: the static checks, the screenshots, and one semantic fix Kiro
left behind — a lawful erasure that re-hashes in place leaves a matching hash, so the
verifier had to report declared lawful changes independently of the mismatch loop.

## What this does not guarantee

Stated plainly in [`docs/limits.md`](docs/limits.md): key custody, object-lock
storage and multi-cloud parity are simulated and labelled in the UI. There is no
protection against an attacker holding both the signing key and the anchor store, no
penetration test, and no regulatory certification.
