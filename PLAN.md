# Plan / handoff — Anchora (Kiroween 2026)

**Status as of Wed 25 Nov 2026.** Written so another agent, or me with no context, can
resume cold. Numbers here are measured, not remembered.

- **Competition:** Kiroween 2026 (Devpost, sponsored by AWS/Kiro)
- **Entry:** Anchora — category **Skeleton Crew**
- **Deadline:** **Fri 4 Dec 2026, 14:00 PT = 22:00 London.** Freeze `main` **Thu 3 Dec 18:00 London**.
- **Prize target:** 1st Overall ($30,000) / Best Skeleton Crew ($5,000) / Best Demo ($1,000) + Bonus stack
- **Live:** https://tradexy.github.io/reliquary/ (`/seal/`, `/witness/`)
- **Repo:** https://github.com/tradexy/reliquary (public, MIT)
- **Local:** `/Users/tradexy/Documents/competitions/261204-kiroween-hack`

Read this before touching anything.

---

## 1. What we built, and why

Anchora is an **evidence core** for audit trails in sealed (air-gapped, regulated)
environments, with two apps on one core:

- **Seal** — *did anything change?* 500 hash-chained events, Ed25519 seals, anchors in
  create-only storage, an SVG chain-fracture visualizer, a 4-mode tamper simulator
  (including **Rewrite chain from here** caught by external seals & anchors), an offline
  browser `.json` dropzone verifier, a Kiro Build Trail preset, and an offline verifier CLI.
- **Witness** — *did the action leave a record?* 15 auditable actions classified
  fail-closed vs queue, an interactive outage drill with live activity feed & outbox
  (grant/guardrail raise refused; revoke/disable queued), simulated coverage-gap guard,
  lawful-change accounting, and compliance evidence linking directly into Seal.

**Category rationale:** Skeleton Crew = "a skeleton template plus **two distinct applications**
built from it." `@anchora/core` is the shared skeleton powering `apps/seal` and `apps/witness`,
plus `tools/verify`, `tools/mcp`, and `.kiro/powers/anchora`.

## 2. Scope of this submission

Anchora is a single, self-contained entry: the evidence core, the two apps, the CLI, the
offline MCP server, and both deterministic fixtures (`bundle.json`, `kiro-audit.bundle.json`)
were written for this competition. There is no third-party code beyond the dependencies in
`package-lock.json`.

## 3. Test and verification state

| Check | Result |
| --- | --- |
| `npm run verify` | **198 tests** across 17 files, typecheck clean (4 projects), security scan clean (64 files) |
| `npm run test:pbt` | **198 tests** at 1,000 PBT runs clean |
| `npm run build` | both apps build (Vite, CSP injected) |
| `npm run verify:bundle -- packages/core/data/bundle.json` | PASS, 500 events / 9 seals / 4 anchors, 3 lawful changes (`144`, `288`, `401`) |
| `npm run verify:bundle -- packages/core/data/kiro-audit.bundle.json` | PASS, 24 events / 4 seals / 2 anchors, 1 lawful change (`19`) |
| `kiro-cli agent validate` + live `@security-auditor` MCP run | both agents valid (exit 0); live MCP verified both bundles + 0 coverage gaps |
| CI | GitHub Actions: `npm run verify` → build → CLI verification (both bundles) → deploy Pages |

Bundle key fingerprint: `7f2d0c75f3608e2d2f9743ca688960c5`

**Note:** the bundle's signing key is derived from a committed seed in
`scripts/generate-stream.ts` and is *not* committed. Only the public key ships. That
is deliberate (see `docs/limits.md`).

## 4. Competition compliance

**All rules, eligibility, prizes and mechanics live in [`RULES.md`](RULES.md).** Do not
restate them here; update that file instead.

Outstanding items only:

- [ ] Demo video, under 3 minutes, public on YouTube (1920×1080, captions, no music)
- [ ] Devpost submission form, category **Skeleton Crew**
- [ ] Blog post (bonus, mentions Kiroween 2026)
- [ ] Social post starting with `#KiroweenHackathon26` (bonus)
- [ ] Freeze `main` **Thu 3 Dec 18:00 London** (judges test the live URL until 29 Jan 2027)
- [ ] Cancel Kiro Pro by **27 Nov** to avoid a charge on 1 Dec (CLI/MCP evidence already captured)

Verified as already compliant: built in period, Kiro usage, public repo, MIT licence in
About, `/.kiro` at root and not gitignored, live URL with no login. Full checklist:
`RULES.md` §11.

## 5. Judging rubric → evidence

| Criterion (20% each) | Our evidence |
| --- | --- |
| Potential Impact | Banks/defence/pharma; the auditor who must not trust the operator. Concrete Northgate story on the landing page + browser dropzone + offline CLI. |
| Technological Implementation | Full Kiro stack: 4 steering docs, 15 EARS requirements, 3 hooks, 2 validated custom agents, offline MCP server (`tools/mcp/`), Kiro Power, 198 tests, PBT, self-audited `kiro-audit.bundle.json` + live `@security-auditor` MCP run in `docs/kiro-evidence.md`. |
| Design | Two coherent themes, centered plain-English "Start here" pages, SVG chain-fracture & architecture diagrams, accessible tables. |
| Innovation | Two-pillar thesis, full-chain rewrite caught by external anchor, lawful-change classification, first-divergence index, honest `simulated` labelling. |
| Presentation | Chronological landing story timeline; 2:45 1080p video script in `docs/video-script.md` and `docs/kiro-evidence.md`. |

## 6. Remaining work

| # | Task | Date | Notes |
| --- | --- | --- | --- |
| 1 | Red-team live URLs (`1024/1280/1440`) + review bonus drafts | 25–26 Nov | DO1 review pass |
| 2 | Cancel Kiro Pro | by 27 Nov | Avoids 1 Dec charge |
| 3 | Record video (<3 min), upload public | 27–28 Nov | 1920×1080, captions, no music, script in `docs/video-script.md` |
| 4 | Publish Blog post (Kiro + build) | 29 Nov | Must mention Kiroween 2026 |
| 5 | Publish Social post `#KiroweenHackathon26` | 29 Nov | Must start with the hashtag |
| 6 | Devpost form, category **Skeleton Crew** | 3 Dec | Draft early from `docs/submission.md`; leave credentials blank |
| 7 | Final compliance pass + freeze `main` | 3 Dec 18:00 | Check licence, `.kiro`, URLs, video visibility |

Cut order if time slips: EU AI Act evidence mapping → anchors side panel → insert and
delete tamper modes (keep edit & rewrite) → Witness evidence tab polish. Never cut the CLI,
the divergence index, or the outage drill.

## 7. How to resume cold

```bash
cd /Users/tradexy/Documents/competitions/261204-kiroween-hack
npm ci
npm run verify
npm run dev:seal       # :5180
npm run dev:witness    # :5181
npm run verify:bundle -- packages/core/data/bundle.json
npm run verify:bundle -- packages/core/data/kiro-audit.bundle.json
```

Key files:

| File | Why |
| --- | --- |
| README.md | the pitch, plus "How Kiro was used" |
| `.kiro/specs/anchora-evidence/requirements.md` | 15 requirements (EARS) |
| `.kiro/specs/anchora-evidence/design.md` | chain, canonical form, seals, anchors, verifier |
| `.kiro/steering/*.md` | product, tech, security, conventions |
| `.kiro/agents/*.json` | validated custom agents (`security-auditor`, `evidence-builder`) |
| `.kiro/settings/mcp.json` | offline Anchora MCP server registration |
| `.kiro/powers/anchora/POWER.md` | installable Skeleton Crew Kiro Power |
| `docs/kiro-evidence.md` | judge-scannable summary of all Kiro primitives & live MCP output |
| `docs/skeleton-guide.md` | 3-step quickstart to extend `@anchora/core` into a 3rd domain app |
| `docs/limits.md` | what is simulated — read before writing any claim |
| `docs/threat-model.md` | 13 threats, controls and residual risk |
| `docs/traceability.md` | requirements → tests, with gaps stated |
| `docs/demo-plan.md` | data composition and the demo beat sheet |
| `docs/kiro-journal.md` | dated record of what Kiro did and what broke |
| `RULES.md` | competition rules, prizes, and operational lessons |
| `packages/core/data/bundle.json` | the 500-event fixture (regenerate with `npm run generate:stream`) |
| `packages/core/data/kiro-audit.bundle.json` | the 24-event Kiro self-audit trail (`npm run generate:kiro-audit`) |

## 8. Environment gotchas

- **Kiro CLI identity:** must be signed in with **Google** (`kiro-cli login --social
  google`). The device-flow path minted a separate **Builder ID** with the same email,
  which had no plan and refused every request with "monthly usage limit". This wasted
  hours. `kiro-cli whoami` must say "Logged in with Google".
- **Kiro free plan blocks the CLI** even with bonus credits; IDE and Web still work.
- **jsdom has no `crypto.subtle`** — `vitest.setup.ts` installs Node's WebCrypto.
- **CI is slower than local** — async assertions get 10s, test timeout 20s, and the
  Seal tests use a 40-event fixture to avoid rendering 500 rows in jsdom.
- **Vite base is `./`** and routing is query/hash based, because GitHub Pages has no
  SPA fallback beyond `404.html`.

## 9. Machine storage plan

Current disk: **~38 GB free** of 228 GB. `~/Documents/competitions` is **22 GB**.

**This project:** 123 MB total, of which 116 MB is `node_modules`. After submission:

```bash
cd /Users/tradexy/Documents/competitions/261204-kiroween-hack
rm -rf node_modules apps/*/dist
npm cache clean --force   # optional, frees ~1 GB
```

Everything needed to rebuild is in git, so nothing is lost: `npm ci` restores it.

**About Colab/GPUs:** irrelevant to this competition. There is no training, no
dataset, and no model to run — the entire build is TypeScript, hashing and UI. The
heaviest compute is `npm run verify` (~2 s). Do not move anything to Colab for this
project; it would add risk for no benefit.

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| Judges read "audit app" as dull | Landing page story, tamper-on-camera, full-chain rewrite proof, outage drill; video leads with the story |
| Overclaiming security | `docs/limits.md`; `simulated` badges; rubric wording says tamper-*evident* |
| Video left to the last day | Script ready in `docs/video-script.md`; record 27–28 Nov |
| Kiro CLI blocked again | Live `@security-auditor` + MCP evidence already captured before 27 Nov cancel |
| Accidental push after submission | Freeze `main` on **Thu 3 Dec 18:00 London**; work on a branch after that |
| Losing context | `PLAN.md` + `PLAN_GEM_261124.md` + `COORDINATION.md`. |
