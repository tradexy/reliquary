# Devpost submission copy — Anchora

Keep in sync with the repo. Category: **Frankenstein**.

## Project name

Anchora

## Tagline

Every action is recorded, and every record is provably unchanged.

## Inspiration

A regulated organisation can now put AI agents behind its own data, but its auditor is
left with two questions no dashboard can answer. Has anything in the audit log been
changed since it was written? And did every action that should have left a record
actually leave one?

We kept seeing the same failure in vendor demos: a green "audit" page that reads the
same database an administrator can edit. A record you can rewrite proves nothing.

## What it does

Two apps, one evidence core.

**Seal** proves nothing changed. Five hundred events are hash-chained, sealed with
Ed25519, and anchored into create-only storage. Edit a row and verification reports
`HASH_MISMATCH` at that exact sequence number, with a first-divergence index.
Recomputing every later hash does not help, because a signed copy of the chain head was
already written somewhere the operator cannot delete.

**Witness** proves nothing was missed. Fourteen auditable actions are classified
fail-closed or queue. During an audit-store outage a role grant is refused
(`audit-unavailable`) while a revoke completes and queues its record durably. A coverage
matrix shows each action and whether a test proves it; a build guard fails when a
catalogued action has no test.

The claim neither app can make alone: **every action is recorded, and every record is
provably unchanged.**

## How we built it

TypeScript throughout, npm workspaces, React and Vite, Vitest with property-based tests.
Cryptography is `@noble/ed25519` plus WebCrypto SHA-256, with one canonical
serialisation function shared by the chain, the seals and the verifier — change it and
every hash changes, so bundles refuse to mix format versions instead of passing falsely.

The offline verifier is a separate CLI that imports no React and makes no network calls,
so an assessor can copy it next to an exported bundle on a sealed machine:

```
npm run verify:bundle -- bundle.json
```

It recomputes every hash, link, sequence, seal signature and anchor digest, classifies
lawful change separately from tampering, and exits non-zero on any finding.

Determinism matters here: the 500-event fixture is generated from a committed seed, so a
judge can regenerate it and get byte-identical data, then verify it themselves.

## How Kiro was used

Spec-first, with Kiro CLI. Steering documents fixed the promises before any code —
"the verifier is the product", "never overstate", "lawful change is classified, not
concealed" — then fifteen EARS requirements, a design document, and a task list. Each
task group went to Kiro as its own scoped headless run, with a commit between runs.

Kiro wrote the canonical serialiser, hashing, key handling, signing, the append log, the
verifier and its finding codes, the capture writers, the evidence mapping, the shared UI
and both applications. It also found and fixed its own error: `configureGlobalConfig`
does not exist in fast-check 3.x, found by running the suite rather than reading code.

Hooks gate the work rather than relying on discipline: a verification gate on agent stop
(typecheck, static security scan and the full suite must pass before a turn can finish),
a security scan after every write, and contract tests on adapter edits.

What the human did: the static checks, the screenshots, and one semantic fix the agent
left behind — a lawful erasure that re-hashes in place leaves a matching hash, so the
verifier had to report declared lawful changes independently of the mismatch loop.

## Challenges

The hardest part was refusing to make the report decorative. A badge that says "verified"
is worthless if it can be set by hand, so the status is computed from the counts, the
anchor is a real create-only write, and the export is checked by a separate tool. That
constraint shaped the whole design.

The second challenge was honesty. Key custody, object-lock storage and multi-cloud parity
are simulated in this build. Rather than hedge, every simulated control carries a badge
and `docs/limits.md` lists exactly what is not guaranteed.

## What's next

A real KMS-backed key, an S3 Object Lock anchor store in a separate account, append-only
database grants, and a nightly verifier that pages from tamper-evident state.

## Built with

TypeScript, React, Vite, Vitest, fast-check, @noble/ed25519, WebCrypto, GitHub Actions,
GitHub Pages, Kiro CLI.
