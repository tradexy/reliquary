# Kiro journal

A running, dated record of what Kiro actually did on this project. This is the raw
material for the "how Kiro was used" write-up and the video's final section, so it
is written as it happens, not reconstructed afterwards.

Rule: if it isn't in here, it doesn't go in the submission.

---

## 2026-11-13 — Setup

- Registered for Kiroween 2026 (Skeleton Crew).
- Kiro CLI 3.3.0 installed; signed in as Builder ID.
- Credits requested (4,000, review ~48h). Building on the free tier until they land.
- Wrote steering docs by hand: `product.md`, `tech.md`, `conventions.md`.
- Wrote `requirements.md` (8 requirements, EARS style) before any code existed.
- Wrote `design.md` and `tasks.md`.

**Observation to write up later:** writing the steering docs first changed what the
requirements said. The "lossless or it tells you what it lost" promise only became a
requirement after `product.md` forced a single non-negotiable. That ordering —
steering, then requirements, then design — is the thing worth explaining to judges.

**Parked:** anything requiring compute (install, tests, builds).

---

## 2026-11-14 — Task 1, workspace scaffold (Kiro CLI)

One headless Kiro run, scoped to Task 1 only:

```
kiro-cli chat --no-interactive --trust-all-tools "Read .kiro/steering/*.md, design.md
and tasks.md. Implement Task 1 only: items 1.1 to 1.4. ... Do NOT run npm install."
```

Kiro produced 18 files: root tsconfigs, vitest config with the `PBT_RUNS` knob
wired into `configureGlobalConfig`, three workspace `package.json` files, Vite
configs aliasing `@reliquary/kit/*` straight to source, and app entry points.

What I had to correct by hand afterwards:

- The generated base tsconfig set `noEmit` alongside `composite` + `declaration`,
  which cannot build. Simplified to `noEmit` only and dropped project references.
- Root `typecheck` used `tsc -b`, which requires composite. Now runs `tsc -p` per
  workspace.
- Missing test-environment dependencies (jsdom, testing-library) were absent from
  the root, so the configured `jsdom` environment would have failed on first run.

**Observation to write up later:** the useful part of spec-driven development here
was that the spec constrained *scope*, not that it produced perfect code. Kiro
implemented exactly Task 1 and stopped — and the mistakes it made were all in the
build configuration, the one area the spec did not specify. That's a clean example
of specs covering behaviour well and infrastructure poorly, which is worth saying
plainly in the submission rather than pretending the first pass was flawless.
