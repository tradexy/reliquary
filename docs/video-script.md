# Demo video — script and shot list

Target **2:45**, hard limit **3:00**. Judges are not required to watch past 3:00.

Record **1920×1080 (16:9, 60fps)**, browser zoom **115%**, no bookmarks bar, no
notifications. Cuts only, no copyrighted music. Burn in high-contrast captions positioned
above the bottom 12% so they never cover controls or divergence callouts.

---

## 0:00–0:20 — The Lie (Hook)

**Screen:** Landing page (`site/index.html`) story timeline, then click **Open Seal at seq 217 →**.

**Voice:** "Northgate Bank runs AI agents over commercial loan files. At sequence 217, an
agent approves a two-million-pound loan. Later, an engineer with database access flips
that row to declined. No alert fires. The dashboard stays green — because the dashboard
reads the same table he just edited."

## 0:20–0:58 — Break It Twice (Seal)

**Screen:** Seal → Chain, `seq 217` selected (`£2,000,000 · approved`), preimage visible, SVG Chain Visualizer green.
1. Click **Edit this record** → preimage diff flashes `decision: approved → declined`, SVG link fractures crimson, Findings highlights `HASH_MISMATCH at seq 217`.
2. Click **Rewrite chain from here** → all 500 event links turn consistent, and **SEAL + ANCHOR** explodes red (`SEAL_INVALID`, `ANCHOR_MISSING` at seq 240).

**Voice:** "Watch what happens when we edit seq 217. The SVG chain fractures immediately:
first divergence, 217. Now suppose the engineer is clever and recomputes every hash from
217 to 500. Every link looks valid — and Seal still catches it at sequence 240, because
an Ed25519 seal and create-only anchor were already written where nobody here can erase."

## 0:58–1:35 — Prove Nothing Was Missed (Witness)

**Screen:** Click top bar **Witness** → **Drill**.
1. Toggle **Audit store available** off (red simulated outage banner).
2. Click **Grant a role** and **Raise guardrail ceiling** → both **refused (`audit-unavailable`)** in live activity feed.
3. Click **Revoke a role** → **queued** into durable outbox. Toggle store back on → **Flush outbox** → seq 501 lands.
4. Click **Evidence** → **EU AI Act Art. 12** → click `seq 217` chip to jump straight back to Seal, or click **Export evidence bundle**.

**Voice:** "Integrity isn't enough if an action never left a record. In Witness, when the
audit store goes down, widening actions like role grants and guardrail raises stop dead.
Revoking access still completes and queues durably until the store recovers. Every SOC 2,
ISO 27001, and EU AI Act control links straight back to the verified events — and exports
to a single offline file."

## 1:35–2:20 — Kiro Deep-Dive + Self-Audit (45 seconds)

**Screen:**
1. Terminal: `npm run verify:bundle -- packages/core/data/bundle.json` (PASS), then doctor & run → `FAIL, divergence 217, exit 1`.
2. Quick split-cut: `.kiro/specs/anchora-evidence/requirements.md` + `.kiro/hooks/verify-on-stop.json` + `.kiro/agents/security-auditor.json` + `.kiro/powers/anchora/POWER.md`.
3. In Seal, click **Kiro Build Trail (24)** pill → `PASS` — and run `npm run verify:bundle -- packages/core/data/kiro-audit.bundle.json`.

**Voice:** "Underneath both apps is one reusable Skeleton Crew core built spec-first with
Kiro: fifteen EARS requirements, three verification hooks, two validated custom agents, a
Kiro Power, and an offline Anchora MCP server. In fact, Anchora's own Kiro build
milestones ship as a second Ed25519-sealed bundle you can verify live right here."

## 2:20–2:45 — Impact & Close

**Screen:** Landing page SVG architecture diagram (`@anchora/core` → `Seal` + `Witness` + `CLI & MCP`), highlighting `simulated` honesty badges.

**Voice:** "Every simulated boundary — KMS custody, object lock, outage drill — is labelled
plainly. Zero network calls, zero login, one offline file any auditor can check in under
a second. Anchora: every action is recorded, and every record is provably unchanged."

---

## Production checklist

- [ ] Browser 1920×1080 at 115% zoom, clean incognito window, bookmarks hidden
- [ ] Rehearse the two Seal clicks (**Edit** → **Rewrite chain from here**) and Witness outage toggle
- [ ] Verify captions sit clear of the Findings list and SVG visualizer
- [ ] Upload to YouTube as **Public**, title `"Anchora — Kiroween 2026 (Skeleton Crew)"`
- [ ] Include GitHub repo URL and live GitHub Pages URL in the video description
