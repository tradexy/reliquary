# Anchora

**Every action is recorded, and every record is provably unchanged.**

Built for [Kiroween 2026](https://kiroween.devpost.com/) in the **Skeleton Crew**
category: one reusable cryptographic audit-evidence skeleton (`@anchora/core`) powering
two distinct applications (**Seal** and **Witness**), an offline verifier CLI, and an
offline Kiro MCP server.

| | |
| --- | --- |
| Live | https://tradexy.github.io/reliquary/ |
| Seal (integrity) | https://tradexy.github.io/reliquary/seal/#chain?seq=217 |
| Witness (capture) | https://tradexy.github.io/reliquary/witness/#drill |
| Licence | MIT |

> *Repository slug note:* the GitHub repository keeps the initial Nov 13 scaffold slug
> (`tradexy/reliquary`) to preserve live GitHub Pages URLs; the project was pivoted and
> built from scratch as **Anchora** from Nov 18 onward (see [`docs/kiro-journal.md`](docs/kiro-journal.md)).

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

## The Skeleton + Two Apps

- **`packages/core` (`@anchora/core`)** — shared evidence skeleton: canonical
  serialisation (`anchora/1`), WebCrypto SHA-256 chain, `@noble/ed25519` seals,
  create-only `wx` anchors, fail-closed/queue capture engine, compliance predicates,
  and themed UI primitives. See [`docs/skeleton-guide.md`](docs/skeleton-guide.md).
- **`apps/seal` (Integrity Vault)** — 500 events, interactive SVG chain-fracture
  visualizer, canonical preimage inspection, tamper simulator (**Edit**, **Delete**,
  **Insert**, and **Rewrite chain from here** — proving that recomputing all downstream
  hashes still fails at the externally signed seal & anchor), plus an offline browser
  `.json` dropzone verifier and preset **Kiro Build Trail** bundle.
- **`apps/witness` (Capture Registry)** — 15 auditable actions classified `fail-closed`
  or `queue`, live outage drill with activity feed & durable outbox (widening grants and
  guardrail raises refuse; revokes and disables queue), coverage matrix with build guard
  and simulated-gap toggle, and SOC 2 / ISO 27001 / EU AI Act evidence deep-linking back
  to Seal.

## Verify it yourself (zero network, offline CLI)

Two signed bundles ship in the repository: `packages/core/data/bundle.json` is the
500-event Northgate Bank demo stream, and `packages/core/data/kiro-audit.bundle.json` is
Anchora's own 24-event Kiro build audit trail.

```bash
npm ci
npm run verify:bundle -- packages/core/data/bundle.json
npm run verify:bundle -- packages/core/data/kiro-audit.bundle.json
```

```
Anchora bundle verification
  format      anchora/1
  events      500
  seals       9
  anchors     4
  key         7f2d0c75f3608e2d2f9743ca688960c5

  INFO  seq  144  LAWFUL_CHANGE      seq 144: lawful erasure authorised by dpo@northgate.example
  INFO  seq  288  LAWFUL_CHANGE      seq 288: lawful retention authorised by retention-scheduler
  INFO  seq  401  LAWFUL_CHANGE      seq 401: lawful payload-stripped authorised by jose.singh

  result      PASS
  divergence  none
```

Edit one field of `bundle.json` (e.g. flipping `seq 217` from `approved` to `declined`)
and the same command exits `1` with `divergence 217`.

## Layout

```
packages/core        evidence core skeleton: crypto, chain, capture, evidence, ui
apps/seal            integrity console + SVG chain visualizer + browser dropzone
apps/witness         capture coverage, outage drill, and compliance console
tools/verify         offline verifier CLI (no React, no network)
tools/mcp            offline Kiro MCP server (stdio JSON-RPC, 4 tools)
scripts              deterministic seeded bundle + Kiro self-audit generators
.kiro                steering, EARS specs, 3 hooks, 2 custom agents, MCP config, Power
docs                 kiro-evidence, skeleton-guide, threat model, limits, traceability
```

## Run it

```bash
npm ci
npm run dev:seal            # http://localhost:5180
npm run dev:witness         # http://localhost:5181
npm run verify              # typecheck + security scan + all Vitest suites
npm run test:pbt            # property-based suite at 1,000 runs
npm run generate:stream     # regenerate the 500-event Northgate bundle (deterministic)
npm run generate:kiro-audit # regenerate the 24-event Kiro build trail bundle
npm run mcp                 # start the offline Anchora stdio MCP server
```

## How Kiro was used

Spec-first with **Kiro** across the full lifecycle — documented in [`docs/kiro-evidence.md`](docs/kiro-evidence.md) and [`docs/kiro-journal.md`](docs/kiro-journal.md):

- **Steering** (`.kiro/steering/`) fixed the promises before any code: *"the verifier is
  the product"*, *"never overstate"*, *"lawful change is classified, not concealed"*.
- **Specs** (`.kiro/specs/anchora-evidence/`) carry 15 EARS requirements, canonical
  preimage rules, verification algorithm, and task breakdown.
- **3 Hooks** (`.kiro/hooks/`) gate every change: `verify-on-stop`, `security-on-write`,
  and contract tests on core edits.
- **2 Custom Agents** (`.kiro/agents/`): `security-auditor` and `evidence-builder`,
  validated with `kiro-cli agent validate`.
- **Offline MCP Server + Kiro Power** (`.kiro/settings/mcp.json`, `.kiro/powers/anchora/`):
  exposes `verify_bundle`, `inspect_seq`, `check_coverage`, and `check_compliance` directly
  to Kiro agents, plus a verifiable **Kiro Build Trail** (`kiro-audit.bundle.json`).

## What this does not guarantee

Stated plainly in [`docs/limits.md`](docs/limits.md): key custody, object-lock
storage and multi-cloud parity are simulated and labelled in the UI. There is no
protection against an attacker holding both the signing key and the anchor store, no
penetration test, and no regulatory certification.
