# Demo video — script and shot list

Target **2:45**, hard limit **3:00**. Judges are not required to watch past 3:00.

Record **1920×1080 (16:9, 60fps)**, browser zoom **115%** (or `node GA2_demo_player/play.mjs` for automated paced capture), no bookmarks bar, no notifications. Cuts only, no copyrighted music. Place high-contrast captions at least 12% above the bottom edge so they never cover controls or divergence callouts.

---

## 0:00–0:20 — 1. Landing Story → Open Seal at seq 217 (20s)

**Screen:** Landing page (`https://tradexy.github.io/reliquary/`): hold on hero & `@anchora/core` Skeleton Crew diagram (`0:00–0:07`), smooth-scroll through **The story** (`09:14` `seq 217` £2,000,000 commercial loan approval, `0:07–0:15`), return to top and click **Open Seal at seq 217 →** (`0:15–0:20`).

**Voice:** "Northgate Bank runs AI agents over commercial loan files. At sequence 217, an agent approves a two-million-pound facility for Meridian Holdings. Later, someone with database access flips that row to declined — and the dashboard stays green because it reads the same mutable table."

## 0:20–0:40 — 2. Edit seq 217 → Fracture (20s)

**Screen:** Seal → Chain with `seq 217` selected (`£2,000,000 · approved`), canonical preimage visible, green SVG Chain Visualizer (`PASS · 500 events`). Click **Edit this record** (`0:28`): red field diff (`detail.decision: approved → declined`), crimson SVG fracture, Findings highlighting `HASH_MISMATCH at seq 217`.

**Voice:** "In Seal, we inspect the exact canonical bytes hashed into sequence 217. The moment we edit that record, recomputing SHA-256 exposes the changed field, fractures the SVG chain red, and pinpoints the exact first divergence: sequence 217."

## 0:40–1:00 — 3. Rewrite Chain → Caught at Seal/Anchor 240 (20s)

**Screen:** Click **Rewrite chain from here** (`0:43`). Hold on the SVG diagram showing downstream hashes forged consistent (`seq 217..500`) yet **SEAL + ANCHOR** exploding red with **Rewrite attack caught** (`SEAL_INVALID` and `ANCHOR_MISSING` at `seq 240`).

**Voice:** "Now suppose the attacker is clever and recomputes every hash from 217 all the way to 500. Every link looks consistent — and Seal still stops the rewrite dead at sequence 240, because an Ed25519 seal and create-only anchor were already written outside the database."

## 1:00–1:25 — 4. Download Tampered `.json` → Restore → Drop Back → FAIL (25s)

**Screen:** Scroll to the top bundle bar while the chain is still broken:
1. Click **Download .json** (`anchora-northgate-tampered.bundle.json`, `1:03`).
2. Click **Restore** so Seal returns to green **PASS · 500 events** (`1:09`).
3. Drop / upload that downloaded `.json` back into **Drop or open bundle .json** (`1:14`) → immediate **`FAIL · divergence 240`** (`SEAL_INVALID` / `ANCHOR_MISSING`).

**Voice:** "Better yet, proof shouldn't depend on our demo buttons. We download that tampered working copy as JSON, restore Seal to green PASS, and drop the file we just saved straight back in. Offline WebCrypto verifies the file from scratch and immediately flags `FAIL`."

## 1:25–1:55 — 5. Witness Drill: Refused vs Queued (30s)

**Screen:** Click top-bar **Witness** → **Drill**.
1. Toggle **Audit store available** off (red **Simulated outage active** banner, `1:30`).
2. Click **Grant a role** and **Raise guardrail ceiling** → both **refused (`audit-unavailable`)** (`1:36`).
3. Click **Revoke a role** → **queued** into **Durable outbox (1)** (`1:44`).
4. Toggle **Audit store available** back on → click **Flush outbox** → `seq 501` lands (`1:50`).

**Voice:** "Integrity isn't enough if an action never left a record. In Witness — our second app built on the same `@anchora/core` skeleton — an outage stops privilege grants and guardrail raises cold. Revoking access still completes and queues durably until the store recovers."

## 1:55–2:15 — 6. Evidence Tab → Control → Supporting Events (20s)

**Screen:** Click **Evidence** (`1:55`). Select an **EU AI Act** or **SOC 2** control (`1:59`), hold on `complete`, event count, and clickable `seq` chips (`2:04`), then click **Verify this export** → **`PASS`** (`500` events, `9` seals, `4` anchors, key fingerprint `7f2d0c75...`, `2:09–2:15`).

**Voice:** "Every SOC 2, ISO 27001, and EU AI Act control maps straight to verified sequence numbers you can open in Seal — or verify offline inside one exported evidence bundle."

## 2:15–2:25 — 7. Start Here Plain-English Walkthrough (10s)

**Screen:** Click top-bar **Seal** → **Start here** (`2:15`). Smooth-scroll briefly over **What Seal does** and the 3-block broken-link diagram (`2:18–2:25`).

**Voice:** "And because an audit tool shouldn't require a cryptographer to read it, both apps open with a plain-English Start here walkthrough."

## 2:25–2:45 — 8. Kiro Build Trail, Specs/Hooks & Green Suite (20s)

**Screen:**
1. Switch to **Chain** → click **Kiro Build Trail (24)** pill → **`PASS · 24 events`** (`2:25–2:32`).
2. Return to Landing page → highlight **Built with Kiro — and self-audited** 4-card grid + `@anchora/core` Skeleton Crew diagram (`2:32–2:45`).
3. *(Optional B-roll insert if cutting in an editor: quick 4s flash of `.kiro/specs/`, `verify-on-stop.json` hook, and `npm run verify` showing **199/199** green tests.)*

**Voice:** "Built spec-first with Kiro — fifteen EARS requirements, three hooks, two validated agents, a Kiro Power, an offline MCP server, and 199 passing tests — plus Anchora's own Kiro build trail sealed as a second live bundle. Every boundary is honestly badged, with zero network calls: every action recorded, and every record provably unchanged."

---

## Production checklist

- [ ] Browser **1920×1080**, clean Chrome window (`node GA2_demo_player/play.mjs`), bookmarks & extensions hidden
- [ ] Pass 1: record silent 1080p video (`node GA2_demo_player/play.mjs --record`, or QuickTime/OBS watching the live headed run)
- [ ] Pass 2: record voiceover cleanly over the finished 2:45 video
- [ ] Upload to YouTube as **Public**, title `"Anchora — Kiroween 2026 (Skeleton Crew)"`
- [ ] Include GitHub repo URL (`https://github.com/tradexy/reliquary`) and live GitHub Pages URL (`https://tradexy.github.io/reliquary/`) in the video description
