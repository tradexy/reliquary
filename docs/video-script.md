# Demo video — script and shot list

Target: **2:50**, hard limit 3:00. Judges are not required to watch past 3:00, so
the last 10 seconds are a buffer, not content.

Record at 1440×900, browser at 100%, no bookmarks bar. One take, cuts only — no
transitions, no music. Captions burned in, since many judges watch muted.

---

## 0:00 – 0:15 — The problem, stated as a fact

**Screen:** the Card Catalogue, report screen, already loaded. Close on the counts.

**Voice:** "Two thousand records from a 1994 dBase export. Three of them are broken.
A normal migration would swallow those three and nobody would ever know."

## 0:15 – 0:40 — Who this is for

**Screen:** search `WOOD`, scroll the results, open one record.

**Voice:** "This is Ashworth Local History Society — a volunteer archive with a card
index and no budget for a collections system. They can't put this online, because
nobody can prove a rebuild didn't quietly drop a row."

## 0:40 – 1:05 — What the kit does

**Screen:** the record view. Open the provenance disclosure.

**Voice:** "Reliquary wraps a dead source in a modern interface and makes one promise:
lossless, or it tells you exactly what it lost. Every field carries its provenance —
this title came from that column, in that export."

## 1:05 – 1:35 — The report

**Screen:** `View report`. Slow pan across counts, mapping table, rejected rows.

**Voice:** "Every import produces a report. Rows in, rows out, every rejected row and
why. Two thousand in, one thousand nine hundred and ninety-seven out, three
rejected — and it adds up. If it didn't add up, the build would refuse to publish."

## 1:35 – 2:00 — Break it on camera

**Screen:** click **Simulate a lossy adapter**.

Badge flips to INCONSISTENT, danger colour, delta shown.

**Voice:** "So let's break it. One row disappears. The status flips, the delta appears,
and the publish guard refuses the dataset. The failure is louder than the success —
which is the point."

Click **Restore verified report**.

## 2:00 – 2:30 — The second app, different job

**Screen:** Parts Ledger landing → Start walk → count 14 against ledger 16 → note and
initials → confirm.

**Voice:** "Same kit, opposite question. A scrapyard ledger inherited in an
acquisition. Not 'where is it' but 'is the paper true?' Pick a bin range, walk two
hundred and twenty-eight entries, and every disagreement is signed for."

## 2:30 – 2:50 — Kiro

**Screen:** editor, `.kiro/specs/reliquary-kit/requirements.md`; then
`.kiro/hooks/verify-on-stop.json`; then a green test run.

**Voice:** "Built with Kiro, spec first. Requirements, then design, then tasks —
then one scoped run per task. Three hooks gate the work: tests on adapter edits, a
security scan on every write, and a verification gate that won't let a turn finish
green until typecheck, the scan and two hundred and one tests pass."

**Screen:** the failing-then-passing commit, if time allows.

**Voice:** "It caught its own mistakes. That's the part worth trusting."

## 2:50 – 2:58 — Close

**Screen:** landing page, both cards.

**Voice:** "Reliquary. Two apps, one skeleton, and a report that proves it."

---

## Production checklist

- [ ] Kill notifications, hide the menu bar, close other tabs
- [ ] Seed the search box empty so the first frame is the report, not a keyboard
- [ ] Rehearse the break-it click — it must land within one second of the line
- [ ] Record system audio only, then replace with narration
- [ ] Burn captions; check they don't cover the counts
- [ ] Upload unlisted, watch it back on a phone, then make public
- [ ] Title: "Reliquary — Kiroween 2026" ; description includes the repo URL

## What not to do

- No logo intro. The first frame must be the product.
- No talking head.
- Don't explain the stack. Nobody scores TypeScript.
- Don't say "secure". Say what was tested.
