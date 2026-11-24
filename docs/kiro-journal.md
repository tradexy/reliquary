# Kiro journal

A dated record of what Kiro actually did on Anchora, and what broke. This is raw
material for the "how Kiro was used" write-up and the video's final section.

Rule: if it isn't in here, it doesn't go in the submission.

---

## 2026-11-13 — Setup

- Registered for Kiroween 2026; Kiro CLI 3.3.0 installed; signed in.
- Credits requested (4,000; review ~48h).
- Wrote steering before requirements. Writing `product.md` first changed what the
  requirements said: "the verifier is the product" and "never overstate" only became
  concrete promises after that file existed.

**Observation for the write-up:** steering → requirements → design → tasks is the order
that produced a testable design. Reversing it would have produced features, not claims.

---

## 2026-11-19 — Core, in five scoped runs

Kiro CLI, one headless run per task group, with a commit between runs.

**Tasks 1–3 (crypto).** Kiro built `canonical()`, sha256 over WebCrypto, Ed25519 keys and
sign/verify. It chose to keep PEM headers honest ("ED25519 PRIVATE KEY", raw bytes rather
than pretending to be X.509). 44 tests.

**Tasks 4–5 (chain).** `createLog().append()` computes seq, prevHash and hash together
and freezes the result; `verifyChain` implements the truth table for edit, delete, insert
and reorder. Kiro's own test suite found a semantic hole I had to fix: a lawful erasure
that re-hashes in place leaves a matching hash, so the mismatch loop never saw it. The
verifier now reports declared lawful changes independently of the mismatch loop — which
is also what an auditor would want.

**Tasks 6–8 (data and verifier).** Generated the 500-event fixture from a committed seed
(9 seals, 4 anchors, three lawful changes at 144/288/401, refusals at 212–213, a queued
revoke at 214). Built the offline CLI: PASS on the bundle, `divergence 217` on a doctored
copy, exit 1.

**Tasks 9–10 (capture and evidence).** `createCapture().perform()` with fail-closed and
queue paths, a durable in-memory outbox, and a coverage guard that fails when a catalogued
action has no test. Three standards mapped to predicate-based controls so every claim
resolves to event seqs.

**Observation:** the useful part of spec-driven work was scope, not perfection. Each run
stopped where the task list stopped, which kept commits reviewable.

---

## 2026-11-19 — UI and apps (tasks 11–13)

Two runs: shared shell plus Seal, then Witness.

**Seal.** Chain table with per-row state, record detail showing the exact canonical
preimage, seals and anchors with signature status, a tamper simulator that edits a frozen
copy and reports the first divergence, and a five-control strip.

**Witness.** Coverage matrix, outage drill (grant refused, revoke queued, flush), lawful
change ledger, evidence export with in-memory verification.

**Observation:** Kiro added an `eventPreimage()` helper and made `append` and the verifier
share it, so the bytes shown in the UI are provably the bytes that were hashed. That was
better than the spec asked for.

---

## 2026-11-19/20 — CI, three real failures

Locally green, red on GitHub Actions, three different reasons:

1. **jsdom has no `crypto.subtle`** — every hashing and signing test failed on Node 20.
   Fixed by installing Node's WebCrypto in `vitest.setup.ts` and pinning CI to Node 22.
2. **The Seal tests rendered 500 table rows in jsdom** and timed out on a slower runner.
   Verification itself is 31 ms; the cost was the DOM. Gave `App` an optional `bundle`
   prop and the tests a 40-event fixture. Suite: 11.7 s → 1.5 s.
3. **Async assertions had a 1 s window** — raised to 10 s.

**Observation for the write-up:** the agent wrote code that passed its own tests and still
shipped a layout that only a screenshot caught (bare-ID rows, a bin picker that looked
filled but was empty, full-bleed text). Tests and eyes find different defects.

---

## 2026-11-20 — Plain-English intros

Feedback: the apps were legible to engineers and opaque to everyone else. Kiro added a
shared `Intro` component and a "Start here" screen per app, first in the tab list.

Then a second pass: the copy explained mechanics before it gave anyone a reason to care.
Rewritten to open with a story — a bank, a changed row, one command — then three steps,
one illustration, one worked example, one button. No jargon survives without a clause of
definition.

**Observation:** the best line in the whole build came out of that rewrite — "the
dashboard is green, because the dashboard reads the same table that was just edited."

---

## What Kiro got right unassisted

- The pipeline module split: `pipeline` / `report` / `publish` in the earlier concept, and
  `chain` / `capture` / `evidence` here.
- Predicate-based evidence controls, so each claim resolves to events rather than to a
  paragraph.
- Sharing `eventPreimage()` between append and verify.
- Finding its own fast-check API error by running the suite instead of reading code.

## What the human caught

- A `maxSize`/`maxLength` mix-up that left tests green while types were wrong.
- The lawful-change classification hole.
- Layout failures invisible to tests: bare-ID rows, a picker that looked filled but was
  empty, full-bleed text at 8 px from the edge.
- The Builder ID / Google identity split that made the CLI refuse every request.
