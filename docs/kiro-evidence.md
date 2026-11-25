# Kiro Implementation Evidence — Anchora

A judge-scannable summary of every Kiro primitive used to specify, build, gate, and audit **Anchora** (Skeleton Crew category, Kiroween 2026).

---

## 1. End-to-End Kiro Architecture

```text
Steering (.kiro/steering/*.md)
   │  Fixed invariants before code: "verifier is the product", "never overstate"
   ▼
EARS Specs (.kiro/specs/anchora-evidence/)
   │  15 requirements → design.md → 16-group tasks.md
   ▼
Scoped Agent Runs + Custom Agents (.kiro/agents/)
   │  security-auditor.json  +  evidence-builder.json  (validated via kiro-cli)
   ▼
3 Automated Hooks (.kiro/hooks/)
   │  PostToolUse(write)  → security-check.mjs
   │  PostFileSave(core)  → vitest run --reporter=dot
   │  Stop                → npm run verify (tsc + security-check + 190+ tests)
   ▼
Offline MCP Server + Kiro Power (.kiro/settings/mcp.json, .kiro/powers/anchora/)
   │  verify_bundle · inspect_seq · check_coverage · check_compliance
   ▼
Self-Audited Build Trail (packages/core/data/kiro-audit.bundle.json)
   24 dated milestones sealed with Ed25519 + anchored + verified offline in CI
```

---

## 2. Kiro Primitives in This Repository

| Primitive | Path | Role |
| --- | --- | --- |
| **Steering (4 files)** | [`.kiro/steering/`](../.kiro/steering) | `product.md`, `tech.md`, `security.md`, `conventions.md` lock down crypto boundaries, Result returns, zero runtime network calls, and honest wording. |
| **Specs (3 files)** | [`.kiro/specs/anchora-evidence/`](../.kiro/specs/anchora-evidence) | 15 EARS requirements, canonical preimage & verification algorithm in `design.md`, and 16 implementation task groups in `tasks.md`. |
| **Hooks (3 files)** | [`.kiro/hooks/`](../.kiro/hooks) | `security-on-write.json`, `contract-on-core-change.json`, and `verify-on-stop.json` block turns unless typecheck, static scan, and all tests pass. |
| **Custom Agents (2)** | [`.kiro/agents/`](../.kiro/agents) | `security-auditor.json` (read-only MCP verifier) and `evidence-builder.json` (spec-driven builder), both validated with `kiro-cli agent validate`. |
| **Offline MCP Server** | [`.kiro/settings/mcp.json`](../.kiro/settings/mcp.json) + [`tools/mcp/`](../tools/mcp/server.ts) | Pure stdio JSON-RPC 2.0 server exposing `verify_bundle`, `inspect_seq`, `check_coverage`, and `check_compliance` with zero extra dependencies. |
| **Kiro Power** | [`.kiro/powers/anchora/POWER.md`](../.kiro/powers/anchora/POWER.md) | Reusable Skeleton Crew onboarding Power + MCP config + domain extension steering. |
| **Property-Based Tests** | [`packages/core/src/**/*.test.ts`](../packages/core/src/chain/verify.test.ts) | `fast-check` invariants over canonical serialisation, Ed25519 signatures, chain linkage, edit/delete/insert/reorder detection. |

---

## 3. Verifiable Gate Outputs

### Hook gate (`npm run verify`)
```text
> tsc -p packages/core && tsc -p apps/seal && tsc -p apps/witness && tsc -p tools
> node scripts/security-check.mjs
security-check: clean (64 files scanned)
> npx vitest run
```

### Self-audit trail (`npm run verify:bundle -- packages/core/data/kiro-audit.bundle.json`)
```text
Anchora bundle verification
  format      anchora/1
  events      24
  seals       4
  anchors     2
  key         cc43bb0e7789b34a62f28015b79e9972

  INFO  seq   19  LAWFUL_CHANGE      seq 19: lawful payload-stripped authorised by tradexy

  result      PASS
  divergence  none
```

You can inspect this Kiro build trail interactively in **Seal** by clicking the **Kiro Build Trail (24)** pill at the top of the Chain view, or inspect individual build events via the Anchora MCP server (`inspect_seq`).

---

## 4. Live Kiro Agent + MCP + Power Invocation Evidence

Captured directly from `kiro-cli` 3.5.0 inside this repository:

### Agent discovery & validation
```text
$ kiro-cli agent list
Workspace: ~/Documents/competitions/261204-kiroween-hack/.kiro/agents
  evidence-builder    Workspace     Spec-driven builder for Anchora ...
  security-auditor    Workspace     Read-only auditor for Anchora ...

$ kiro-cli agent validate --path .kiro/agents/security-auditor.json
$ kiro-cli agent validate --path .kiro/agents/evidence-builder.json
# both exit 0
```

### Live `@security-auditor` run invoking Anchora MCP tools
```text
$ kiro-cli chat --agent security-auditor --no-interactive --trust-workspace \
  --trust-tools=@anchora/verify_bundle,@anchora/check_coverage,fs_read \
  --require-mcp-startup \
  "Call @anchora/verify_bundle on packages/core/data/bundle.json and packages/core/data/kiro-audit.bundle.json, plus @anchora/check_coverage."

[tool] Running: @anchora/verify_bundle
[tool] Running: @anchora/verify_bundle
[tool] Running: @anchora/check_coverage
[tool] status: Completed (x3)

packages/core/data/bundle.json
- Result: PASS, format anchora/1, first divergence none.
- Counts: 500 events, 9 seals, 4 anchors.
- Key fingerprint: 7f2d0c75f3608e2d2f9743ca688960c5.
- Lawful seqs: 144 (erasure, dpo@northgate.example), 288 (retention, retention-scheduler), 401 (payload-stripped, jose.singh).

packages/core/data/kiro-audit.bundle.json
- Result: PASS, format anchora/1, first divergence none.
- Counts: 24 events, 4 seals, 2 anchors.
- Key fingerprint: cc43bb0e7789b34a62f28015b79e9972.
- Lawful seq: 19, payload-stripped, authorised by tradexy.

Coverage (check_coverage)
- gapCount is 0 and gaps is empty.
- 15 catalogued actions, all tested (9 fail-closed, 6 queue).
```

*(Because `--trust-tools` scoped permissions strictly to the Anchora MCP verification tools and `fs_read`, `security-auditor`'s attempted shell grep was cleanly denied by Kiro CLI — and the agent honestly refused to claim overclaim-check completion without running it.)*

