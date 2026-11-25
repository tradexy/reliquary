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
