# Reliquary

**A skeleton kit for resurrecting dead software — and proving nothing was lost.**

Built for [Kiroween 2026](https://kiroween.devpost.com/) in the **Skeleton Crew** category.

---

## The problem

Every museum, library, parish council, scrap yard and family business in the country
is sitting on a dead system: a `.dbf` file nobody can open, a card index, a fax
order book, a DOS-era stock ledger. The data is fine. The software is gone.

Rebuilding the interface is easy. **Trusting the migration is not.** The reason these
records stay dead is that nobody can prove a rebuild didn't quietly drop 300 rows.

## What Reliquary is

A lean template — a *skeleton* — for wrapping a dead data source in a modern web
interface, with one non-negotiable promise:

> **Lossless, or it tells you exactly what it lost.**

Reliquary gives you:

1. **A two-method contract.** Any legacy source implements `scan()` and `count()`.
   That's the whole adapter surface. Everything else is shared.
2. **A Resurrection Report.** Every import produces a signed-off artefact:
   records in, records out, fields mapped, fields unmapped, rows rejected and why.
   This is the thing you show the archivist who doesn't trust you yet.
3. **A polished shell.** Search, record detail, and the report — three screens,
   one design system, no build-it-yourself UI work.

## Two applications from one foundation

The point of a skeleton is versatility, so the kit ships with two apps that share
the same core and look nothing alike:

| App | Dead source | Domain |
| --- | --- | --- |
| **Card Catalogue** | A 1990s library card index + `.dbf` export | Public library local history collection |
| **Parts Ledger** | A dot-matrix stock ledger from a scrapyard | Salvaged vehicle parts |

Same contract. Same report. Different data, different skin, different user.

## Why this scores

- **Impact** — a real, unglamorous, widespread problem with a named user (the
  archivist who has to sign off on the migration).
- **Innovation** — lossless migration is treated as a *first-class, auditable
  artefact* rather than something you hope for.
- **Tech** — the adapter contract is enforced with property-based tests, so
  "nothing was lost" is a tested invariant, not a claim.
- **Design** — one coherent art direction across both apps.
- **Presentation** — "4,212 records in, 4,212 out, 0 lost" is a legible demo in
  four seconds.

## Repository layout

```
reliquary/            the skeleton kit (published package)
  src/contract/       LegacySource interface + validation
  src/import/         scan → normalise → report pipeline
  src/ui/             shared shell: search, detail, report
apps/
  card-catalogue/     app one, built from the kit
  parts-ledger/       app two, built from the kit
.kiro/
  steering/           product, tech and convention guidance for the agent
  specs/              requirements → design → tasks
  hooks/              automated checks wired into the agent lifecycle
docs/
```

## Quick start

```bash
npm install
npm run dev:cards     # Card Catalogue
npm run dev:parts     # Parts Ledger
npm test              # includes property-based adapter tests
```

## How Kiro was used

Built spec-first with **Kiro CLI 3.3.0**. Order of work mattered more than the tool:
steering → requirements → design → tasks → implementation, one scoped run per task
group.

**Steering** (`.kiro/steering/`) — `product.md` fixed the single non-negotiable
("lossless, or it tells you exactly what it lost") before any requirement existed.
`tech.md` set the dependency rules and forbade apps from forking kit components.
`security.md` was added after a threat-model pass and lists eight rules that a
script now enforces.

**Specs** (`.kiro/specs/reliquary-kit/`) — eight EARS requirements, then design,
then tasks. Every task went to Kiro as its own headless run
(`kiro-cli chat --no-interactive`), with a commit between runs.

**Hooks** (`.kiro/hooks/`) — three gates, no prompts involved:

| Hook | Trigger | Action |
| --- | --- | --- |
| `verify-on-stop` | Agent Stop | typecheck + security scan + 219 tests; exit 1 makes Kiro keep working |
| `contract-on-adapter-edit` | File Save on an adapter | re-run the suite |
| `security-on-write` | Post Tool Use on writes | static scan for `eval`, HTML sinks, storage, credentials |

**What Kiro got right, unassisted:** it designed the pipeline module split
(`pipeline` / `report` / `publish`) better than the spec asked, chose a
non-throwing `ValidationResult` for callers and a throwing assertion at the
boundary, and diagnosed its own bug — `configureGlobalConfig` does not exist in
fast-check 3.x — by running the suite rather than reading its code.

**What it got wrong, and who caught it:** `tsc` caught a `maxSize`/`maxLength`
confusion that left tests green while types were wrong. Screenshots caught three
layout failures the suite was indifferent to: bare-ID result rows, a bin picker that
looked filled but was empty, and full-bleed text at 8px from the edge. The honest
division of labour was: Kiro implements and self-corrects at runtime; a human runs
the static checks and looks at the page.

**What we did not use:** Kiro Crew and MCP are not part of this build. We would
rather say so than pad the write-up.

## Licence

MIT — see [LICENSE](./LICENSE).
