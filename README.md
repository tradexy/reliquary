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

## Licence

MIT — see [LICENSE](./LICENSE).
