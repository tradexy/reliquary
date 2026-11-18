# End-to-end plan: data, demo, checkpoints

## 1. The data

One seeded evidence stream, generated once and committed, so every environment shows
the same numbers and a judge can regenerate it.

**Format:** `anchora/1`, ~500 events.

**Actors** (four, because the demo needs a villain and a witness):

| Actor | Role | Why they exist |
| --- | --- | --- |
| `dana.okafor` | owner | Widening actions: invites, role grants, connector changes |
| `ravi.menon` | security lead | Settings, routing, key rotation |
| `alina.petrova` | auditor | Read-only access events; the person whose checks we are modelling |
| `system` | scheduler | Seals, anchor writes, nightly verification runs |

**Areas:** identity (sign-in, MFA, invite), roles (grant, revoke), agents (run,
handoff), routing (model pool change), settings (guardrail ceiling), governance
(erasure, retention, payload strip, evidence export).

**Composition of the 500:**

- 480 ordinary events, weighted so identity and agent runs dominate
- 8 seals (every 60 events), 4 anchors (every 120)
- 3 lawful changes, each followed by its marker event:
  - erasure of one subject's payload at seq 144
  - retention checkpoint at seq 288
  - payload strip at seq 401
- 2 refusals, recorded as `outcome: refused` (audit store down during a role grant)
- 1 queued event (a revoke that completed while the store was down)
- 1 key rotation at seq 300, with its own event

**Tamper fixtures** (not in the committed stream — applied in memory by the UI):
- edit `subject` at seq 217
- delete seq 355
- insert a re-hashed event between 410 and 411

## 2. The demo, beat by beat

| Time | Screen | Action | Line |
| --- | --- | --- | --- |
| 0:00 | Seal, controls strip | All five controls `ok` | "Five hundred audit events. Every one sealed, anchored and verified." |
| 0:15 | Chain table | Open seq 217, show the exact bytes that were hashed | "This is the record, and this is the hash it produced." |
| 0:40 | Seal | **Edit the subject** → verify | "Someone with database access changes one field." |
| 0:55 | Findings | `HASH_MISMATCH` at 217, first divergence 217 | "Not 'failed'. Here, at this row." |
| 1:10 | Anchors | Anchor 2 still matches, head no longer does | "Recomputing every hash does not help — the anchored head is already written." |
| 1:25 | Terminal | `npm run verify:bundle` → exit 1 | "And the assessor's tool says the same, offline." |
| 1:40 | Seal | Restore → verify → passes | "Put it back and the trail is clean again." |
| 1:50 | Witness, coverage | Matrix, gap count 0 | "Capture asks the other question: did the action leave a record?" |
| 2:05 | Witness, drill | Store down → grant role **refused**; revoke **queued** | "Widening stops. Tightening still completes, queued durably." |
| 2:25 | Witness, evidence | SOC 2 control → events → export | "Every claim points at records you can verify." |
| 2:40 | Terminal | Export → CLI → exit 0 | "Two pillars, one file, no trust required." |

The single image to remember: **the row that says 217**.

## 3. Build order and checkpoints

| Checkpoint | Date | Must be true |
| --- | --- | --- |
| C1 | 22 Nov | Core: canonical, hash, keys, append, verify, PBT green. Demo data generated. |
| C2 | 25 Nov | CLI verifier works on a doctored bundle. Seal app renders the chain and the first divergence. |
| C3 | 28 Nov | Witness app: coverage, drill, evidence, export. |
| C4 | 1 Dec | Old apps removed, README and limits rewritten, deployed, screenshots taken. |
| C5 | 3 Dec | Video recorded, Devpost submitted, blog and social posted. |

If a checkpoint slips, cut in this order: EU AI Act mapping → anchors column →
tamper insert/delete (keep edit) → coverage matrix detail. Never cut the CLI, the
first-divergence index, or the fail-closed drill.

## 4. What makes it a great demo rather than a good one

1. **A number, not an adjective.** "Divergence at 217" is checkable; "tamper-evident"
   is not.
2. **Two independent checks agree.** The UI says 217, the offline CLI says 217.
3. **The refusal is visible.** A widening action that stops is more memorable than a
   chart that is green.
4. **Nothing is claimed that isn't shown.** Every simulated control carries a badge,
   so the demo earns trust instead of spending it.

## 5. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Crypto in the browser is fiddly | `@noble/ed25519` in the core, same code path in CLI and UI |
| Judges can't run the CLI | "Verify this file" panel in the app shows the same result, and the CLI is one command in the README |
| Two apps drift into one look | Two themes and two different primary tasks, enforced by the shared-shell design |
| Time | Checkpoint C1 on 22 Nov; cut list above is pre-agreed |
