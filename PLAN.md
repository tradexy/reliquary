# Plan / handoff — Anchora (Kiroween 2026)

**Status as of Sat 21 Nov 2026.** Written so another agent, or me with no context, can
resume cold. Numbers here are measured, not remembered.

- **Competition:** Kiroween 2026 (Devpost, sponsored by AWS/Kiro)
- **Entry:** Anchora — category **Frankenstein**
- **Deadline:** **Fri 4 Dec 2026, 14:00 PT = 22:00 London.** Submit Thu 3 Dec.
- **Prize target:** Best Frankenstein ($5,000), plus Overall and the bonus stack
- **Live:** https://tradexy.github.io/reliquary/ (`/seal/`, `/witness/`)
- **Repo:** https://github.com/tradexy/reliquary (public, MIT)
- **Local:** `/Users/tradexy/Documents/competitions/261204-kiroween-hack`

Read this before touching anything.

---

## 1. What we built, and why

Anchora is an **evidence core** for audit trails in sealed (air-gapped, regulated)
environments, with two apps on one core:

- **Seal** — *did anything change?* 500 hash-chained events, Ed25519 seals, anchors in
  create-only storage, a tamper simulator that reports `HASH_MISMATCH` at an exact seq
  with a first-divergence index, and an offline verifier CLI.
- **Witness** — *did the action leave a record?* 14 auditable actions classified
  fail-closed vs queue, an outage drill (grant refused, revoke queued), lawful-change
  accounting, and compliance evidence that traces to event seqs.

Neither claim is sufficient alone, which is the Frankenstein argument: integrity
without capture proves an incomplete record is unchanged.

**Category rationale:** Frankenstein = "stitch together seemingly incompatible
elements". Cryptography + compliance evidence + air-gapped operation is that stitch.
Skeleton Crew would have required a template + two apps framing we no longer satisfy.

## 2. Where we came from (do not rebuild this)

The first submission was **Reliquary** (Skeleton Crew): a kit for resurrecting dead
data sources, with a Card Catalogue and a Parts Ledger. It worked — 219 tests, two
apps, deployed — but it was **boring**: a card index and a stocktake. Feedback from
the user was blunt and correct, so the concept was replaced on 19 Nov. The old
`apps/card-catalogue`, `apps/parts-ledger` and `packages/reliquary` are deleted and
their tests gone; do not look for them in git history expecting them back.

What survived from that phase: the method (steering → spec → design → tasks → scoped
implementation runs), the hooks, the security scan, and the journal.

## 3. Test and verification state

| Check | Result |
| --- | --- |
| `npm run verify` | **180 tests**, typecheck clean, security scan clean |
| `npm run build` | both apps build (Vite) |
| `npm run verify:bundle -- packages/core/data/bundle.json` | PASS, 500 events / 9 seals / 4 anchors, 3 lawful changes |
| Doctored bundle | FAIL, `divergence 217` |
| CI | GitHub Actions: tests → CLI verification → build → deploy Pages |

Bundle key fingerprint: `7f2d0c75f3608e2d2f9743ca688960c5`

**Note:** the bundle's signing key is derived from a committed seed in
`scripts/generate-stream.ts` and is *not* committed. Only the public key ships. That
is deliberate (see `docs/limits.md`).

## 4. Competition compliance checklist

From the Official Rules — verify before submitting:

- [x] Built during the Submission Period (started 13 Nov 2026)
- [x] Uses Kiro (CLI 3.4.0, supported by steering, specs, hooks, journal)
- [x] Public GitHub repo, MIT licence visible in About
- [x] `/.kiro` at repo root, **not** gitignored
- [x] Working URL, no login required, free for judges until 29 Jan 2027
- [ ] Demo video, under 3 minutes, public on YouTube — **outstanding**
- [ ] Devpost submission form, category Frankenstein — **outstanding**
- [ ] Blog post (bonus, 100 winners) — **outstanding**
- [ ] Social post with `#KiroweenHackathon26` (bonus) — **outstanding**
- [ ] Freeze `main` after submission (no pushes — judges test the live URL)

Credits: 4,000 Kiroween credits granted; Pro upgraded (free first month) — **cancel by
27 Nov** to avoid a charge on 1 Dec.

## 5. Judging rubric → evidence

| Criterion (20% each) | Our evidence |
| --- | --- |
| Potential Impact | Banks/defence/pharma; the auditor who must not trust the operator. Concrete Northgate story on the landing page. |
| Technological Implementation | Spec-first Kiro use: 15 EARS requirements, design, hooks as gates, 180 tests, PBT, offline CLI. Journal records what Kiro got right and wrong. |
| Design | Two coherent themes, plain-English "Start here" page per app, no stock imagery, accessible tables. |
| Innovation | Two-pillar thesis, lawful-change classification, first-divergence index, honest `simulated` labelling. |
| Presentation | Landing story timeline; video script in `docs/video-script.md` (needs rewrite for Anchora). |

## 6. Remaining work

| # | Task | Date | Notes |
| --- | --- | --- | --- |
| 1 | Rewrite `docs/video-script.md` for Anchora | 22 Nov | Beat sheet: story → Seal tamper → CLI → Witness drill → Kiro |
| 2 | Design polish pass | 23–24 Nov | Seal time column wraps; Witness sparse; tighten both |
| 3 | Record video (<3 min), upload public | 27–28 Nov | 1440×900, captions, no music |
| 4 | Blog post (Kiro + build) | 29 Nov | Must mention Kiroween 2026 |
| 5 | Social post `#KiroweenHackathon26` | 29 Nov | Must start with the hashtag |
| 6 | Devpost form, category Frankenstein | 3 Dec | Draft early; leave credentials notes blank |
| 7 | Final compliance pass + freeze `main` | 3 Dec | Check licence, `.kiro`, URLs, video visibility |
| 8 | Cancel Kiro Pro | 27 Nov | Avoids 1 Dec charge |

Cut order if time slips: EU AI Act evidence mapping → anchors side panel → insert and
delete tamper modes (keep edit) → Witness evidence tab polish. Never cut the CLI, the
divergence index, or the outage drill.

## 7. How to resume cold

```bash
cd /Users/tradexy/Documents/competitions/261204-kiroween-hack
npm ci
npm run verify
npm run dev:seal       # :5180
npm run dev:witness    # :5181
npm run verify:bundle -- packages/core/data/bundle.json
```

Key files:

| File | Why |
| --- | --- |
| README.md | the pitch, plus "How Kiro was used" |
| `.kiro/specs/anchora-evidence/requirements.md` | 15 requirements (EARS) |
| `.kiro/specs/anchora-evidence/design.md` | chain, canonical form, seals, anchors, verifier |
| `.kiro/steering/*.md` | product, tech, security, conventions |
| `docs/limits.md` | what is simulated — read before writing any claim |
| `docs/threat-model.md` | 8 threats, controls and residual risk |
| `docs/traceability.md` | requirements → tests, with gaps stated |
| `docs/demo-plan.md` | data composition and the demo beat sheet |
| `docs/kiro-journal.md` | dated record of what Kiro did and what broke |
| `packages/core/data/bundle.json` | the 500-event fixture (regenerate with `npm run generate:stream`) |

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

Largest offenders (measured 21 Nov):

| Path | Size | Recommendation |
| --- | --- | --- |
| `263011-pump-or-dump-solana/data` | 10 GB | Archive to external drive or Drive, keep a `data/README` with the source URL |
| `261130-predicting-soil-grain-size-images/data` + `reports` | 2.7 GB | Archive; keep `submissions/` |
| `261202-gemma4-dev-agent/demo` | 2.0 GB | Regenerable; delete after that competition closes |
| `270113-name-that-llm/kaggle` | 1.3 GB | Kaggle-hosted; safe to download on demand |
| `261201-vr-calibration-aura/data` | 1.2 GB | Keep until that competition closes, then archive |
| `~/Library/Caches` | 5.6 GB | Safe to clear selectively |
| `~/.npm` | 1.0 GB | `npm cache clean --force` after the build is done |
| `~/Downloads` | 0.9 GB | Review and clear |

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
| Judges read "audit app" as dull | Landing page story, tamper-on-camera, outage drill; video leads with the story |
| Overclaiming security | `docs/limits.md`; `simulated` badges; rubric wording says tamper-*evident* |
| Video left to the last day | Script by 22 Nov, recorded 27–28 Nov |
| Kiro CLI blocked again | Identity must be Google; if it fails, IDE/Web still work and local build continues |
| Accidental push after submission | Freeze `main` on 3 Dec; work on a branch after that |
| Losing context | This file. Keep it updated when state changes. |
