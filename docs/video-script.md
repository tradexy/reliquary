# Demo video — script and shot list

Target **2:50**, hard limit 3:00. Judges are not required to watch past 3:00.

Record 1440×900, browser at 100%, no bookmarks bar, no notifications. One take, cuts
only, no music. Burn in captions; many watch muted.

---

## 0:00–0:20 — The lie

**Screen:** landing page, the story timeline.

**Voice:** "On 3 November, an engineer at a bank changed one row in the audit log. An
agent run that had approved a two-million-pound loan now read as declined. The dashboard
stayed green — because the dashboard reads the same table he just edited."

## 0:20–0:35 — The claim

**Screen:** scroll to "Two questions, two apps".

**Voice:** "A record you can rewrite proves nothing. Anchora makes two claims, and
neither app can make them alone: every action is recorded, and every record is provably
unchanged."

## 0:35–1:05 — Seal, and the record itself

**Screen:** Seal → Chain. Open seq 217. Show the canonical preimage.

**Voice:** "Five hundred events, each carrying the hash of the one before it. This is
entry 217, and this is the exact byte sequence that produced its hash. Anyone can
recompute it."

## 1:05–1:35 — Break it on camera

**Screen:** press **Edit this record** → verify.

**Voice:** "So let's do what he did. One field changes. Verification does not say
'failed' — it says divergence at 217. Recomputing every later hash would not help: the
signed head of this chain was already written to storage nobody here can overwrite."

Show the anchors panel: 4 anchors, stored, untouched.

## 1:35–1:50 — The assessor's tool

**Screen:** terminal.

```
npm run verify:bundle -- bundle.json
→ FAIL, divergence 217, exit 1
```

**Voice:** "And the auditor's tool, offline, with no access to the bank, says the same
thing and exits non-zero."

Then restore, verify, PASS.

## 1:50–2:20 — Witness, and the other question

**Screen:** Witness → Drill. Switch the store off. Grant a role → refused. Revoke a role
→ queued. Restore, flush.

**Voice:** "Capture asks what Seal cannot. The audit store goes down. A grant is refused
— no record, no grant. A revoke completes and queues its record, because blocking a
removal would be worse than the outage. When the store returns, the queued row lands."

## 2:20–2:35 — Evidence

**Screen:** Evidence tab → a SOC 2 control → event list → Export → verify in place.

**Voice:** "Every compliance claim points at the events that prove it. Export, and the
same verifier reads the file."

## 2:35–2:50 — Kiro, and close

**Screen:** `.kiro/specs/anchora-evidence/requirements.md`, then
`.kiro/hooks/verify-on-stop.json`, then a green test run.

**Voice:** "Built with Kiro, spec first. Fifteen requirements, a design, then one scoped
run per task. Three hooks gate the work — tests, a security scan, and a verification gate
that will not let a turn finish until typecheck, the scan and a hundred and eighty tests
pass. It caught its own mistakes, which is the part worth trusting."

**Screen:** landing page.

**Voice:** "Anchora. Two apps, one audit trail, and a file you can check yourself."

---

## Production checklist

- [ ] Close other tabs; hide the menu bar; mute notifications
- [ ] Start Seal on the Chain tab with verification already PASS
- [ ] Rehearse the tamper click — it must land within a second of the line
- [ ] Record narration separately, then align
- [ ] Captions must not cover counts or the divergence line
- [ ] Upload unlisted, watch on a phone, then make public
- [ ] Title: "Anchora — Kiroween 2026"; description includes the repo URL

## Do not

- No logo intro. First frame is the story.
- No talking head.
- Don't explain the stack.
- Don't say "secure" or "tamper-proof". Say what was tested.
