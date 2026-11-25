---
name: anchora-evidence
displayName: Anchora Audit Evidence Power
description: Add fail-closed, hash-chained, Ed25519-sealed audit trails and offline verification to AI-agent applications using the Anchora core skeleton.
keywords:
  - audit
  - compliance
  - evidence
  - ed25519
  - tamper-evident
  - fail-closed
inclusion: auto
---

# Anchora Audit Evidence Power

Use this power when building or auditing regulated systems (finance, healthcare, defence, enterprise AI agents) that must prove **nothing changed** (cryptographic integrity) and **nothing was missed** (fail-closed capture).

## Core Guarantees
1. **The verifier is the product:** Every exported `anchora/1` bundle can be checked completely offline via the `verify_bundle` MCP tool or `npm run verify:bundle`.
2. **Fail-closed widening, queued tightening:** Widening actions (role grants, agent deployments, guardrail ceiling raises) must refuse (`audit-unavailable`) when the audit store is down; tightening actions (revokes, disables) execute and queue durably.
3. **Never overstate:** Label simulated custody/object-lock controls as `simulated` and describe the system as **tamper-evident**, never "tamper-proof".

## Available MCP Tools (`anchora`)
- `verify_bundle` — Recompute all hashes, chain links, Ed25519 seals, and create-only anchor digests; report first divergence.
- `inspect_seq` — Show the exact canonical preimage (`eventPreimage`) and SHA-256 verification for any event `seq`.
- `check_coverage` — Verify every catalogued action maps to a passing test (build guard fails on gaps).
- `check_compliance` — Evaluate SOC 2, ISO 27001, and EU AI Act controls against recorded events.

## Steering
See `steering/audit-skeleton.md` for extending `@anchora/core` into a new domain app.
