# Design — Anchora evidence core

## Shape

```
packages/core
  src/crypto/      canonical.ts  hash.ts  sign.ts  keys.ts
  src/chain/       append.ts  verify.ts  findings.ts
  src/capture/     catalogue.ts  writers.ts  coverage.ts
  src/evidence/    standards.ts  export.ts  manifest.ts
  src/ui/          shared shell: chain table, finding list, control panel, theme
apps/seal          integrity console
apps/witness       capture + evidence console
tools/verify       offline verifier CLI
```

Dependencies point one way: apps → core → crypto. `tools/verify` imports only
`crypto` and `chain/verify`, so it can be shipped to an assessor without the apps.

## The record

```ts
interface AuditEvent {
  seq: number
  at: string            // ISO-8601, injected
  actor: { id: string; role: string }
  action: string        // must exist in the catalogue
  subject: string
  outcome: 'committed' | 'refused' | 'queued'
  lawful: 'none' | 'erasure' | 'retention' | 'payload-stripped'
  detail: Record<string, string | number | boolean | null>
  prevHash: string
  hash: string
}
```

`hash = sha256(canonical({...event, hash: undefined}))`. The hash field is the only
one excluded, and `prevHash` is inside the preimage, which is what makes deletion and
reordering detectable rather than merely suspicious.

### Canonical serialisation

One function, `canonical(value): string`:

- object keys sorted by code unit
- no whitespace
- strings JSON-escaped, numbers as `Number#toString()` with a guard against `-0`
- `null` kept, `undefined` forbidden

Changing this function changes every hash ever produced, so it carries
`FORMAT_VERSION` and both the chain and the verifier refuse to mix versions.

## Seals

```ts
interface Seal {
  seq: number
  hash: string
  at: string
  keyId: string          // fingerprint of the public key
  signature: string      // Ed25519 over canonical({seq, hash, at, keyId})
}
```

Keys live in `keys/` beside the data but outside the event store, as a PEM-encoded
keypair. The apps receive only the public key. **Simulated:** production holds the
private key in KMS/HSM and the app never sees it. `keys/` is the honest stand-in and
is labelled in the UI.

## Anchors

```ts
interface Anchor {
  seq: number
  headHash: string
  sealSignature: string
  anchorDigest: string   // sha256(canonical({seq, headHash, sealSignature}))
  at: string
}
```

The anchor store is a directory, one file per anchor, written with
`open(path, 'wx')` — a create-only operation that fails if the key exists. That is a
real conditional write at the filesystem level, and it is the closest honest analogue
to S3 Object Lock compliance mode. **Simulated:** the production store refuses
overwrite and deletion at the account level, not the filesystem level.

## Verification

`verify(bundle, publicKey, expectedFingerprint)` walks the chain once:

1. Check `FORMAT_VERSION`.
2. For each event in order: recompute `hash`; compare with stored `hash`.
3. Check `prevHash` equals the previous event's `hash`.
4. Check `seq` is contiguous from 1.
5. For each seal: check its `seq` exists, its `hash` matches that event, and the
   Ed25519 signature verifies against the supplied public key.
6. For each anchor: recompute `anchorDigest`, compare, and confirm the anchor's
   `headHash` is present in the chain.
7. Classify each divergence: if a lawful marker event exists for that `seq` with the
   matching kind and authority, report `lawful`; otherwise `tampering`.

Output:

```ts
interface VerificationResult {
  ok: boolean
  formatVersion: string
  counts: { events: number; seals: number; anchors: number }
  firstDivergence: number | null
  findings: Finding[]   // { seq, code, severity, message, lawfulBy? }
}
```

Codes are stable strings (`HASH_MISMATCH`, `LINK_BROKEN`, `SEQ_GAP`,
`SEAL_INVALID`, `ANCHOR_MISMATCH`, `ANCHOR_MISSING`, `LAWFUL_CHANGE`,
`VERSION_UNSUPPORTED`) because the CLI, the UI and the tests all assert on them.

## Capture

```ts
type FailMode = 'fail-closed' | 'queue'
```

The catalogue declares every auditable action with `{ id, area, failMode, testRef }`.
`perform(action, change, audit)` is the only write path:

- `fail-closed`: attempt the audit append first; if it throws, the change is not
  applied and the caller receives `{ outcome: 'refused', reason: 'audit-unavailable' }`.
- `queue`: apply the change, push the event to a durable outbox, return
  `{ outcome: 'queued' }`, and flush the outbox when the store recovers.

A `brokenStore` switch (simulated outage) makes the demonstration possible and is the
same switch the tests use.

## Evidence

Standards are plain data: `{ standard, control, statement, query }` where `query` is a
predicate over events, not a string — so it is testable. Export produces a bundle:

```json
{
  "formatVersion": "anchora/1",
  "exportedAt": "...",
  "publicKeyPem": "...",
  "keyFingerprint": "...",
  "events": [],
  "seals": [],
  "anchors": [],
  "lawfulManifest": [],
  "controls": [{ "standard": "...", "control": "...", "eventSeqs": [] }]
}
```

The CLI takes this file plus a `--fingerprint` and exits non-zero on any finding. It
imports nothing from React.

## The two apps

**Seal** — one question: *is this record what it was?*
- Chain table: seq, action, actor, hash prefix, state (ok / lawful / divergent).
- Record detail: the full preimage that was hashed, so a sceptic can recompute it.
- Seals and anchors in a side column, each with a signature status.
- **Tamper simulator**: edit a field or delete a row in an in-memory copy, then run
  verification and see the first divergence. Restore returns to verified.
- Controls strip: chain / signing / anchoring / verification / retention.

**Witness** — one question: *did this action leave a record, and can I prove it?*
- Coverage matrix: every catalogued action, fail mode, test status, gap count.
- Outage drill: flip `brokenStore`, attempt a widening action (refused) and a
  tightening one (queued), see the counters.
- Lawful-change ledger: erasure, retention, payload stripping, with authority.
- Evidence: three standards, each control listing the events that satisfy it, plus
  export and a "verify this file" panel showing the CLI result.

Both apps share the shell components from `@anchora/core/ui`: table, badge, finding
list, control panel, and the theme token system. Different themes: Seal is slate and
bone (a vault); Witness is ink and ledger-green (a registry).

## Deployment

Static builds for both apps, plus the CLI published in the repo. Because Requirement
15 forbids runtime network calls, fonts are system stacks — no Google Fonts. The demo
bundles are generated at build time from a seeded generator, so the deployed apps have
no backend and no storage API.

## Decisions and trade-offs

| Decision | Options | Choice | Why |
|---|---|---|---|
| Signature scheme | HMAC-SHA256 vs Ed25519 | Ed25519 | Asymmetric lets an auditor verify with a public key; HMAC would put the verification secret in the verifier |
| Key storage | In-browser vs file vs KMS | File outside data dir, labelled simulated | Honest, reproducible, and the failure mode (key beside data) is exactly what the brief warns about |
| Anchor store | Real S3 vs filesystem `wx` | Filesystem create-only | A real conditional write, no credentials, works offline |
| Database | SQLite/D1 vs in-memory | In-memory with seeded bundle | A judge can run it with no setup; the guarantee demonstrated is the chain, not the DB |
| Bundle format | JSON vs binary | JSON | The whole point is that someone else can read it |
| Category | Skeleton Crew vs Frankenstein | **Frankenstein** | Two pillars stitched together is the category's own definition |

## What this does not guarantee

Stated in `docs/limits.md` and repeated in the UI: no protection against an attacker
who holds both the signing key and the anchor store; no real KMS, object lock,
database grants or multi-cloud parity; no defence against a compromised build; no
claim of regulatory certification.
