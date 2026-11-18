# Requirements — Anchora evidence core

## Introduction

Anchora gives regulated, air-gapped deployments two proofs about their audit trail:
that every action was recorded (capture) and that no record has changed since
(integrity). This spec covers the shared core, the two applications built on it, and
the offline verifier that lets an outsider check both claims without trusting either
the operator or the database.

Every requirement below is demonstrated in the build or explicitly declared out of
scope in `docs/limits.md`.

## Requirement 1 — One chain format for every evidence type

**User Story:** As an auditor, I want a single record format across audit events,
model calls, agent runs and traces, so that I can verify one chain rather than five.

### Acceptance Criteria

1. THE SYSTEM SHALL define one `AuditEvent` shape with `seq`, `at`, `actor`,
   `action`, `subject`, `outcome`, `lawful`, `prevHash` and `hash`.
2. WHEN an event is appended THE SYSTEM SHALL assign `seq` as the previous `seq + 1`,
   starting at 1.
3. THE SYSTEM SHALL NOT allow a caller to supply `seq`, `prevHash` or `hash`.
4. THE SYSTEM SHALL treat `action` as a member of a declared catalogue, and SHALL
   reject an unknown action at append time.

## Requirement 2 — The hash covers everything that matters

**User Story:** As an attacker with database access, I want an unhashed field I can
quietly change — so the system must not give me one.

### Acceptance Criteria

1. WHEN an event is appended THE SYSTEM SHALL compute `hash` as SHA-256 over the
   canonical serialisation of every field except `hash`, including `prevHash`.
2. THE SYSTEM SHALL serialise canonically: sorted keys, no insignificant whitespace,
   stable number formatting.
3. IF canonical serialisation changes THEN THE SYSTEM SHALL require a format version
   change, and a bundle with a different version SHALL fail verification with a clear
   reason rather than a false pass.

## Requirement 3 — Edits, deletions and insertions are all detectable

**User Story:** As a security lead, I want any of the three tampering moves to be
caught and located.

### Acceptance Criteria

1. WHEN a stored event's field is altered THE SYSTEM SHALL report a hash mismatch at
   that `seq`.
2. WHEN an event is deleted THE SYSTEM SHALL report either a sequence gap or a broken
   link at the following `seq`.
3. WHEN an event is inserted with a recomputed hash THE SYSTEM SHALL report a broken
   link at the insertion point.
4. WHEN two events are reordered THE SYSTEM SHALL report a mismatch at the first
   reordered position.
5. Verification SHALL report the **first divergence index**, not only a boolean.

## Requirement 4 — Appends are a single, ordered operation

**User Story:** As an operator, I want concurrent writers to be unable to fork the
chain.

### Acceptance Criteria

1. THE SYSTEM SHALL expose `append(event)` as one operation that computes `seq`,
   `prevHash` and `hash` together.
2. WHEN two appends are requested concurrently THE SYSTEM SHALL serialise them and
   produce a single linear chain.
3. THE SYSTEM SHALL expose a read-only view; no public API SHALL mutate an existing
   event.

## Requirement 5 — Signed chain heads, key held outside the data

**User Story:** As an auditor, I want a signature I can check with a public key, so
that recalculating every hash is not enough to fool me.

### Acceptance Criteria

1. WHEN a seal is created THE SYSTEM SHALL sign the canonical `{seq, hash, at, keyId}`
   with Ed25519.
2. THE SYSTEM SHALL store the signing key outside the event store, and SHALL expose
   only the public key and its fingerprint to the applications.
3. WHEN the public key differs from the key that signed a seal THE SYSTEM SHALL report
   that seal as invalid, and identify the `seq`.
4. THE SYSTEM SHALL record a key change as its own event, so that rotation is visible.

## Requirement 6 — Anchors in write-once storage

**User Story:** As an auditor, I want the head of the chain copied somewhere the
database owner cannot rewrite.

### Acceptance Criteria

1. WHEN a seal is created THE SYSTEM SHALL write an anchor record containing the
   `seq`, head hash, seal signature and an anchor digest.
2. THE SYSTEM SHALL write anchors with a create-only operation that fails if the key
   already exists.
3. IF an anchor already exists THEN THE SYSTEM SHALL report a collision as a finding,
   not overwrite it.
4. THE SYSTEM SHALL mark anchoring as **simulated** in the UI, naming the production
   equivalent (object lock with compliance mode).

## Requirement 7 — Verification is a runnable artefact

**User Story:** As an assessor, I want to check the trail with a file and a command,
without the vendor's servers.

### Acceptance Criteria

1. THE SYSTEM SHALL provide a CLI that takes an exported bundle and a public key, and
   exits non-zero on any finding.
2. THE CLI SHALL verify: every hash, every link, every sequence, every seal signature,
   and every anchor digest.
3. THE CLI SHALL print a machine-readable summary: counts, first divergence, and each
   finding with its `seq` and reason.
4. THE CLI SHALL run with no network access and no dependency on the applications.

## Requirement 8 — Scheduled verification and alerting

**User Story:** As an on-call operator, I want a failing control to page me, and I
want the application to be unable to silence it.

### Acceptance Criteria

1. THE SYSTEM SHALL run verification on a schedule and record each run as an event.
2. WHEN a run finds any finding THE SYSTEM SHALL raise an alert whose state derives
   from the signed log, not from application settings.
3. THE SYSTEM SHALL show, per control (chain, signing, anchoring, verification,
   retention), a state of `ok`, `degraded` or `failing`.
4. IF verification has not run within its interval THEN THE SYSTEM SHALL report
   `degraded` rather than `ok`.

## Requirement 9 — Lawful change is classified, not concealed

**User Story:** As a compliance officer, I want erasure and retention to be visible
and lawful, so that they are not mistaken for tampering.

### Acceptance Criteria

1. THE SYSTEM SHALL support exactly three lawful-change kinds: `erasure`,
   `retention` and `payload-stripped`.
2. WHEN a lawful change is applied THE SYSTEM SHALL append a marker event naming the
   kind, the target `seq` and the authority.
3. THE VERIFIER SHALL report a marked change as lawful, and an unmarked change as
   tampering.
4. THE SYSTEM SHALL distinguish a re-hashed lawful change from an unexplained one.

## Requirement 10 — Capture is fail-closed where it must be

**User Story:** As an audit domain lead, I want widening actions to stop when the
audit write fails, and tightening actions to still complete.

### Acceptance Criteria

1. THE SYSTEM SHALL classify every catalogued action as `widening` or `tightening`.
2. WHEN a widening action cannot write its event THE SYSTEM SHALL refuse the action
   and return an `audit-unavailable` outcome.
3. WHEN a tightening action cannot write its event THE SYSTEM SHALL complete the
   action and queue the event durably.
4. THE SYSTEM SHALL record every refusal as a visible counter, not only as a log line.
5. THE SYSTEM SHALL provide a switch that simulates audit-store failure, so the
   refusal can be demonstrated and tested.

## Requirement 11 — Coverage is visible and enforced

**User Story:** As an engineer, I want a guard that fails when a mutating route writes
no event.

### Acceptance Criteria

1. THE SYSTEM SHALL render a coverage matrix of every catalogued action, its fail
   mode, and whether a test exists.
2. WHEN a catalogued action has no test THE SYSTEM SHALL report it as a gap.
3. THE BUILD SHALL fail if a mutating action exists in the catalogue without a
   corresponding test.

## Requirement 12 — Evidence traces to records

**User Story:** As a compliance officer, I want each claim in a report to point at
the events that prove it.

### Acceptance Criteria

1. THE SYSTEM SHALL map at least three standards (SOC 2, ISO 27001, EU AI Act) to
   queries over the event stream.
2. WHEN a control is opened THE SYSTEM SHALL list the events that satisfy it, with
   counts and a link to each `seq`.
3. WHEN evidence is exported THE SYSTEM SHALL include the bundle, the public key
   fingerprint, and the manifest of lawful changes.
4. THE SYSTEM SHALL state, per control, whether the evidence is complete or partial
   for the selected period.

## Requirement 13 — Two apps, one core

**User Story:** As a judge, I want the same foundation to produce two genuinely
different products.

### Acceptance Criteria

1. THE REPOSITORY SHALL contain two applications in separate folders under `apps/`.
2. THE TWO APPLICATIONS SHALL share every cryptographic and data behaviour from
   `packages/core` and SHALL NOT duplicate it.
3. Seal SHALL be organised around one record and its proof; Witness SHALL be
   organised around an action and its coverage.
4. THE TWO APPLICATIONS SHALL use different themes and different primary tasks.

## Requirement 14 — Honest claims

**User Story:** As sales or legal, I want wording that is true per deployment.

### Acceptance Criteria

1. THE SYSTEM SHALL never use "tamper-proof" or "immutable" in UI copy or docs.
2. THE SYSTEM SHALL mark each simulated control with a visible `simulated` badge.
3. THE SYSTEM SHALL provide `docs/limits.md` listing what is simulated, what is out of
   scope, and what a production deployment would need.
4. THE SYSTEM SHALL report the claims that are true for the current configuration,
   and suppress those that require a control that is switched off.

## Requirement 15 — Runs sealed

**User Story:** As a buyer in a sealed environment, I want no runtime dependency on
the internet.

### Acceptance Criteria

1. THE SYSTEM SHALL run with no network calls at runtime; fonts SHALL be self-hosted
   or system fonts.
2. THE SYSTEM SHALL require no accounts, API keys or external services.
3. THE SYSTEM SHALL build to static assets, and the CLI SHALL run offline.
