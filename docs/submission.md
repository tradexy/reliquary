# Devpost submission copy — Anchora

Keep in sync with the repo. Category: **Skeleton Crew**.

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

One reusable cryptographic evidence skeleton (`@anchora/core`) powering two distinct
applications, an offline verifier CLI, and an offline Kiro MCP server:

**Seal** (*Integrity Vault*) proves nothing changed. Five hundred events are
hash-chained, sealed with Ed25519, and anchored into create-only storage. Edit `seq 217`
(the £2,000,000 commercial loan approval) and the live SVG chain visualizer fractures at
`HASH_MISMATCH` with a first-divergence index of `217`. Click **Rewrite chain from here**
to simulate an administrator recomputing every downstream hash — all 500 links look
consistent, and Seal immediately catches the attack at the externally signed seal and
create-only anchor (`SEAL_INVALID`, `ANCHOR_MISSING`). You can also drop any exported
`.json` bundle into Seal to verify it offline in the browser, or switch to Anchora's own
**Kiro Build Trail** bundle.

**Witness** (*Capture Registry*) proves nothing was missed. Fifteen auditable actions are
classified `fail-closed` or `queue`. Flip the simulated audit store offline: widening
actions (`roles.grant`, `agents.guardrail.ceiling.raise`) refuse with
`audit-unavailable`, while tightening actions (`roles.revoke`, `agents.disable`) complete
and queue durably into the outbox. A coverage matrix proves every catalogued action has
a test (with an interactive gap simulation showing the build-guard alert), and SOC 2,
ISO 27001, and EU AI Act controls link directly to supporting event seqs in Seal.

The claim neither app can make alone: **every action is recorded, and every record is
provably unchanged.**

## How we built it

TypeScript (`strict: true`), npm workspaces, React and Vite, Vitest with `fast-check`
property-based testing, `@noble/ed25519`, and WebCrypto SHA-256 with zero external
runtime dependencies (strict `connect-src 'none'` CSP, system fonts only).

One canonical serialisation function (`anchora/1`) is shared by the chain, the seals,
the browser UIs, the React-free offline CLI (`npm run verify:bundle`), and the stdio
Kiro MCP server (`tools/mcp/`). Determinism is built in: both the 500-event Northgate
Bank bundle and Anchora's own 24-event **Kiro Build Trail** (`kiro-audit.bundle.json`)
regenerate byte-identically from committed seeds.

## How Kiro was used

Spec-first across the full Kiro stack (detailed in `docs/kiro-evidence.md`):

- **Steering** (`.kiro/steering/`) fixed the architecture promises before any code — *"the
  verifier is the product"*, *"never overstate"*, *"lawful change is classified, not
  concealed"*, and *"zero runtime network calls"*.
- **Specs** (`.kiro/specs/anchora-evidence/`) defined 15 EARS requirements, canonical
  preimage rules, verification algorithm, and 16 scoped task groups.
- **3 Automated Hooks** (`.kiro/hooks/`): `security-on-write` after writes,
  `contract-on-core-change` on core module edits, and `verify-on-stop` gating every turn
  on `tsc` + static security scan + the full Vitest suite.
- **2 Validated Custom Agents** (`.kiro/agents/`): `security-auditor` (read-only claims
  and tamper auditor) and `evidence-builder` (spec-driven core/app builder), validated via
  `kiro-cli agent validate`.
- **Offline MCP Server & Kiro Power** (`.kiro/settings/mcp.json`,
  `.kiro/powers/anchora/`): exposes `verify_bundle`, `inspect_seq`, `check_coverage`,
  and `check_compliance` over stdio JSON-RPC so Kiro agents can verify bundles directly,
  paired with a Skeleton Crew onboarding Power.
- **Self-Audited Kiro Build Trail**: Anchora's own build milestones are recorded as a
  verifiable `anchora/1` bundle (`kiro-audit.bundle.json`) checked in CI alongside the
  Northgate demo stream.

What the human caught and fixed: a `maxSize`/`maxLength` mix-up, a lawful-erasure
classification hole where in-place re-hashing left a matching hash, layout wrapping and
story-beat alignment (`seq 217` and `seq 214`), and the Kiro CLI Google-vs-Builder-ID
auth split.

## Challenges

The hardest part was refusing to make the report decorative. A green badge means nothing
if an administrator can rewrite the underlying table, so every status derives from
recomputed verification findings, create-only `wx` anchors catch full-chain rewrites,
and every simulated production boundary (KMS custody, S3 Object Lock, outage switch) is
explicitly badged `simulated` in the UI and documented in `docs/limits.md`.

## What's next

A KMS/HSM-backed signing key, S3 Object Lock anchor storage in an isolated audit
account, append-only database grants, and a scheduled verifier paging from
tamper-evident state.

## Built with

TypeScript, React, Vite, Vitest, fast-check, @noble/ed25519, WebCrypto, Node.js MCP
(stdio JSON-RPC), GitHub Actions, GitHub Pages, Kiro CLI (specs, steering, hooks,
custom agents, MCP, Powers).
