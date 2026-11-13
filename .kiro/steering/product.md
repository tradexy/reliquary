---
inclusion: always
---

# Product steering — Reliquary

## What we are building

Reliquary is a **skeleton kit**: a lean, opinionated template for wrapping a dead
data source in a modern web interface. It is the submission for Kiroween 2026,
category **Skeleton Crew**.

The kit must prove its versatility by shipping **two distinct applications** built
from it. Both apps live in `apps/` and share everything in `packages/`.

## The one promise

**Lossless, or it tells you exactly what it lost.**

Never silently drop, coerce or "clean" a record. Every import produces a
`ResurrectionReport` containing counts in, counts out, field mappings, unmapped
fields and a list of rejected rows with reasons. If the numbers don't reconcile,
the UI must say so loudly.

## Who it is for

The archivist, registrar or yard foreman who has to sign off on a migration and
has no way to verify it. They are not developers. They do not trust a demo.

## Non-negotiables

1. The adapter surface stays at **two methods**: `scan()` and `count()`.
   If a feature needs a third, the design is wrong.
2. Every app must run locally with `npm run dev:*` and deploy as a static-capable
   web app.
3. Every screen must be reachable from the app's landing state in one click.
4. The report is a first-class screen, not a console log.
5. No feature ships without a test that would fail if the invariant broke.

## What we are explicitly not building

- A general-purpose ETL tool.
- A cloud migration service.
- Multi-tenant auth, billing, teams, or anything with an admin panel.
- An AI chat feature bolted onto the side. If AI appears, it earns its place.

## Tone

Dry, precise, quietly eerie. The aesthetic is a well-kept ossuary: bone, amber,
dust, deep green. Never cartoonish, never gore, no stock-Halloween imagery.
