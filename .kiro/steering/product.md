---
inclusion: always
---

# Product steering — Anchora

## What we are building

**Anchora** is an evidence core for audit trails in sealed environments: air-gapped,
regulated deployments where the auditor does not trust the operator, and the
operator does not trust the database.

Two applications share one core:

- **Seal** — proves nothing changed. Hash-chained events, signed chain heads, anchors
  in write-once storage, scheduled verification, independent offline verifier.
- **Witness** — proves nothing was missed. A catalogue of auditable actions, a
  fail-closed write path, lawful-change accounting, and compliance evidence that
  traces to records.

The single claim, which neither app can make alone:

> Every action is recorded, and every record is provably unchanged.

## Who it is for

The security lead and the auditor in a bank, defence supplier, hospital group or
pharmaceutical company. They cannot trust a vendor's dashboard, and they cannot
trust the customer's database administrator. They can trust arithmetic they can
re-run.

## Non-negotiables

1. **The verifier is the product.** If a claim cannot be checked by someone outside
   the system, with a file and a command, it does not get made.
2. **Never overstate.** "Tamper-evident", never "tamper-proof" or "immutable".
   Every simulated control is labelled as simulated, in the UI and in the docs.
3. **Lawful change is distinguished from tampering, not hidden.** Erasure, retention
   and payload stripping are recorded and reported as lawful by the verifier.
4. **Two apps, one core.** If an app needs different behaviour from the core, change
   the core.
5. **No cloud dependency at runtime.** The demo must work offline, because the
   customers cannot reach the internet.

## Scope for this build

Simulated, and labelled as such: KMS/HSM key custody, object-lock storage, database
row-level grants, multi-cloud parity.

Real, and demonstrated: hash chain, Ed25519 seals, conditional-write anchors,
tamper detection with a first-divergence index, lawful-change classification,
fail-closed capture, coverage matrix, evidence export, offline verifier CLI.

## Tone

Calm, exact, institutional. A safety-deposit box, not a hacker terminal. Numbers,
monospace, and one accent colour per app. No hooded figures, no padlocks, no
"cyber" gradient.
