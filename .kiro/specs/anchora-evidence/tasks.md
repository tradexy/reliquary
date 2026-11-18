# Tasks — Anchora

Ordered so every task ends runnable and verifiable. One Kiro run per task group.

- [ ] 1. Core scaffold
  - [ ] 1.1 `packages/core` with `src/{crypto,chain,capture,evidence,ui}`
  - [ ] 1.2 Rename workspaces; keep the existing build/test/hook plumbing working
  - [ ] 1.3 `FORMAT_VERSION = 'anchora/1'` and a format-version test
  - **Done when:** `npm run verify` still passes on the new workspace layout.

- [ ] 2. Canonical serialisation and hashing
  - [ ] 2.1 `crypto/canonical.ts` — sorted keys, no whitespace, `-0` guard, `undefined` rejected
  - [ ] 2.2 `crypto/hash.ts` — SHA-256 over the canonical string, Node + browser
  - [ ] 2.3 Property tests: key order is irrelevant, whitespace is irrelevant, `-0` vs `0` differ or are rejected, round-trip stability
  - **Done when:** a change to any character of input changes the digest.

- [ ] 3. Keys and signatures
  - [ ] 3.1 `crypto/keys.ts` — generate Ed25519 keypair, fingerprint = base16 SHA-256 of public key
  - [ ] 3.2 `crypto/sign.ts` — sign and verify a seal payload
  - [ ] 3.3 Tests: wrong key fails, tampered payload fails, fingerprint is stable
  - **Done when:** a seal verifies only with the key that signed it.

- [ ] 4. Append
  - [ ] 4.1 `chain/append.ts` — `append(event)` computes `seq`, `prevHash`, `hash`; serialised writes
  - [ ] 4.2 Reject caller-supplied `seq`/`hash`; reject unknown `action`
  - [ ] 4.3 Property tests: linkage holds for any sequence; concurrent appends yield one linear chain
  - **Done when:** no API can mutate an existing event.

- [ ] 5. Verify
  - [ ] 5.1 `chain/verify.ts` — hashes, links, sequence, seals, anchors
  - [ ] 5.2 `chain/findings.ts` — stable codes and first-divergence index
  - [ ] 5.3 Truth-table tests: edit / delete / insert / reorder each produce the right code and index
  - [ ] 5.4 Property tests: any single-field mutation is caught at that `seq`
  - **Done when:** every tamper produces a finding, not a boolean.

- [ ] 6. Seeded evidence stream
  - [ ] 6.1 `scripts/generate-stream.ts` — ~500 events across identity, agents, routing, settings, governance
  - [ ] 6.2 Insert one lawful erasure, one retention checkpoint, one payload strip
  - [ ] 6.3 Deterministic seed committed; regenerate is byte-identical
  - **Done when:** the demo needs no backend and no manual setup.

- [ ] 7. Seals and anchors
  - [ ] 7.1 `chain/seal.ts` — periodic seals over the current head
  - [ ] 7.2 `chain/anchor.ts` — create-only write (`wx`), collision becomes a finding
  - [ ] 7.3 Tests: second write refused; differing digest raises `ANCHOR_MISMATCH`
  - **Done when:** rewriting a chain no longer matches its anchors.

- [ ] 8. Bundle export and offline verifier
  - [ ] 8.1 `evidence/export.ts` — bundle with events, seals, anchors, manifest, public key, fingerprint
  - [ ] 8.2 `tools/verify` CLI — args, exit codes, human and `--json` output
  - [ ] 8.3 Tests: clean bundle exits 0; doctored bundle exits 1 with correct finding
  - **Done when:** a person can verify a file without our servers.

- [ ] 9. Capture
  - [ ] 9.1 `capture/catalogue.ts` — every action with `failMode` and `testRef`
  - [ ] 9.2 `capture/writers.ts` — fail-closed and queue paths, durable outbox
  - [ ] 9.3 Coverage guard test: an action without a test fails the build
  - **Done when:** a widening action cannot commit without its event.

- [ ] 10. Evidence mapping
  - [ ] 10.1 `evidence/standards.ts` — SOC 2, ISO 27001, EU AI Act controls as predicates
  - [ ] 10.2 Per-control event lists and complete/partial state
  - [ ] 10.3 Tests against seeded data: each control resolves to known events
  - **Done when:** every claim points at records.

- [ ] 11. Shared shell and themes
  - [ ] 11.1 Table, badge, finding list, control panel, theme tokens
  - [ ] 11.2 Seal theme (slate/bone) and Witness theme (ink/ledger-green)
  - [ ] 11.3 Accessibility: keyboard paths, roles, reduced motion
  - **Done when:** both apps are assembled from the same components.

- [ ] 12. Seal app
  - [ ] 12.1 Chain table with state per row; record detail showing the hashed preimage
  - [ ] 12.2 Seals and anchors column with signature status
  - [ ] 12.3 Tamper simulator: edit or delete in memory, verify, show first divergence, restore
  - [ ] 12.4 Controls strip: chain, signing, anchoring, verification, retention
  - **Done when:** a judge can break it and be told exactly where.

- [ ] 13. Witness app
  - [ ] 13.1 Coverage matrix with fail mode, test status, gap count
  - [ ] 13.2 Outage drill: widening refused, tightening queued, counters visible
  - [ ] 13.3 Lawful-change ledger with authority
  - [ ] 13.4 Evidence view per standard, export, and "verify this file" result
  - **Done when:** a judge can see a refused action and a complete evidence pack.

- [ ] 14. Retire the old apps
  - [ ] 14.1 Remove `apps/card-catalogue`, `apps/parts-ledger`, `packages/reliquary`
  - [ ] 14.2 Rewrite README, landing page and screenshots
  - [ ] 14.3 Update `docs/submission.md`, `docs/limits.md`, traceability, threat model
  - **Done when:** no catalogue or ledger reference survives anywhere.

- [ ] 15. Evidence of process
  - [ ] 15.1 Journal entries per task group
  - [ ] 15.2 Hooks retargeted at the new workspace and proven to fire
  - [ ] 15.3 Traceability matrix for requirements 1–15
  - **Done when:** a judge can trace every requirement to a test.

- [ ] 16. Submission
  - [ ] 16.1 Video per `docs/video-script.md` (rewritten for Anchora)
  - [ ] 16.2 Blog post and social post
  - [ ] 16.3 Devpost entry, category Frankenstein
