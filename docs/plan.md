# Plan — 13 Nov to 4 Dec 2026

Hard deadline: **Fri 4 Dec, 22:00 UK**. Submit **Thu 3 Dec**.

Budget: ~40 hours of human time. Everything below assumes Kiro does the typing.

## Week 1 — foundation (13–19 Nov)

- [ ] Kit contract + import pipeline + report types
- [ ] Property-based test suite for the contract
- [ ] Card Catalogue app end to end, ugly but working
- [ ] Public GitHub repo with licence and `.kiro/` committed
- [ ] Deploy to a static host, working URL

Exit test: a judge can open the URL, search 2,000 cards, open one, and read a report.

## Week 2 — the second app and the design (20–26 Nov)

- [ ] Parts Ledger app on the same kit, different skin and data shape
- [ ] Design pass: tokens, typography, motion, empty states
- [ ] Accessibility pass, keyboard navigation
- [ ] Second Kiro spec written for the parts app (proves the kit generalises)
- [ ] Hooks wired: tests on stop, adapter contract on adapter edits
- [ ] One MCP server used for real, documented

Exit test: the two apps look like different products that share a spine.

## Week 3 — evidence and submission (27 Nov–3 Dec)

- [ ] 3-minute video: problem (20s), demo (90s), report (30s), Kiro (40s)
- [ ] README final pass, "how Kiro was used" write-up
- [ ] Blog post (Kiroween 2026 mentioned), social post with #KiroweenHackathon26
- [ ] Devpost draft complete, then submitted 3 Dec
- [ ] Compliance check: licence visible, `.kiro/` present, no `.gitignore` entry, video public, URL live

## Risks

| Risk | Mitigation |
| --- | --- |
| Two apps is too much for 40h | Second app is deliberately thin: one adapter, one screen variant |
| Video eats a day | Script written in week 2, recorded in one take, no editing beyond cuts |
| Credits arrive late | Free tier is enough for the kit; credits only speed up the apps |
| Kiro artifacts look generated | Specs written before code, commits between tasks, journal in `docs/kiro-journal.md` |
