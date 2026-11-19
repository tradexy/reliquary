# Limits — what Anchora does not guarantee

Requirement 14 says never overstate. This is the list that keeps us honest.

## Simulated, and labelled in the UI

| Control | In this build | In production |
| --- | --- | --- |
| Key custody | Ed25519 private key in a PEM file beside the data directory | KMS/HSM, key never exported, rotation audited |
| Anchor storage | `open(path, 'wx')` on a filesystem — a real create-only write, but local | S3 Object Lock in compliance mode, Azure immutable blob, GCS retention |
| Separation of duties | One machine, one operator | Anchor store in an account the platform operators do not control |
| Database grants | In-memory store, no SQL privileges | Append-only database login on the audit and seal tables |
| Multi-cloud parity | One deployment, one store | A real store per cloud, each tested on a real account |

Every one of those carries a `simulated` badge in the UI.

## Out of scope

- **No protection against an attacker holding both the signing key and the anchor
  store.** If they have both, they can rewrite history consistently. That is why the
  brief insists the key lives outside the database and the anchor outside the account.
- **No real database.** There is no transaction to fail, so fail-closed is modelled
  as "the append throws", not as a rolled-back SQL transaction.
- **No nightly scheduler.** Verification runs on demand and on app load; a scheduled
  run is represented by events in the stream, not by cron.
- **No alerting integration.** The alert *state* is derived from the signed log, but
  no page is sent.
- **No dependency audit, no SBOM, no penetration test.**
- **No certification.** The SOC 2, ISO 27001 and EU AI Act mappings are evidence
  mappings written by us, not an audit opinion. The statements in the code are
  paraphrases.

## Claims we deliberately do not make

- "Tamper-proof." Never used. The correct claim is **tamper-evident**.
- "Immutable." The database is not immutable; erasure and retention require change.
- "Compliant." The product produces evidence; a compliance officer decides.
- "Secure." We claim specific tested properties (preimage coverage, create-only
  anchors, no HTML sinks, no web storage, no credentials in source), not general
  security.

## What a production deployment would need

1. KMS/HSM with rotation and a key-change alert.
2. A write-once store in a separate account, created by infrastructure code, with
   compliance mode and a minimum retention.
3. Append-only database grants, with a required test on every migration.
4. A scheduler that verifies nightly and pages from tamper-evident state.
5. Real-cloud parity tests before any store is called supported.
6. An independent review of the canonical serialisation and the verifier, because a
   bug there is a false sense of proof.
