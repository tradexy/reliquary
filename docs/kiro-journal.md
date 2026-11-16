# Kiro journal

A running, dated record of what Kiro actually did on this project. This is the raw
material for the "how Kiro was used" write-up and the video's final section, so it
is written as it happens, not reconstructed afterwards.

Rule: if it isn't in here, it doesn't go in the submission.

---

## 2026-11-13 — Setup

- Registered for Kiroween 2026 (Skeleton Crew).
- Kiro CLI 3.3.0 installed; signed in as Builder ID.
- Credits requested (4,000, review ~48h). Building on the free tier until they land.
- Wrote steering docs by hand: `product.md`, `tech.md`, `conventions.md`.
- Wrote `requirements.md` (8 requirements, EARS style) before any code existed.
- Wrote `design.md` and `tasks.md`.

**Observation to write up later:** writing the steering docs first changed what the
requirements said. The "lossless or it tells you what it lost" promise only became a
requirement after `product.md` forced a single non-negotiable. That ordering —
steering, then requirements, then design — is the thing worth explaining to judges.

**Parked:** anything requiring compute (install, tests, builds).

---

## 2026-11-14 — Task 1, workspace scaffold (Kiro CLI)

One headless Kiro run, scoped to Task 1 only:

```
kiro-cli chat --no-interactive --trust-all-tools "Read .kiro/steering/*.md, design.md
and tasks.md. Implement Task 1 only: items 1.1 to 1.4. ... Do NOT run npm install."
```

Kiro produced 18 files: root tsconfigs, vitest config with the `PBT_RUNS` knob
wired into `configureGlobalConfig`, three workspace `package.json` files, Vite
configs aliasing `@reliquary/kit/*` straight to source, and app entry points.

What I had to correct by hand afterwards:

- The generated base tsconfig set `noEmit` alongside `composite` + `declaration`,
  which cannot build. Simplified to `noEmit` only and dropped project references.
- Root `typecheck` used `tsc -b`, which requires composite. Now runs `tsc -p` per
  workspace.
- Missing test-environment dependencies (jsdom, testing-library) were absent from
  the root, so the configured `jsdom` environment would have failed on first run.

**Observation to write up later:** the useful part of spec-driven development here
was that the spec constrained *scope*, not that it produced perfect code. Kiro
implemented exactly Task 1 and stopped — and the mistakes it made were all in the
build configuration, the one area the spec did not specify. That's a clean example
of specs covering behaviour well and infrastructure poorly, which is worth saying
plainly in the submission rather than pretending the first pass was flawless.

---

## 2026-11-14 — Tasks 2 and 3, contract and pipeline (Kiro CLI)

One headless run, scoped to Tasks 2 and 3 only. Kiro designed the module split
itself: `pipeline.ts` (drain and separate), `report.ts` (compute status),
`publish.ts` (refuse to publish an inconsistent report). It chose a Result-shaped
`ValidationResult` that never throws, plus a separate throwing `assertValidSource`
at the pipeline entry — a better split than the spec asked for, and it explained
why.

It also caught a real bug in its own Task 1 output: `vitest.setup.ts` called
`configureGlobalConfig`, which does not exist in fast-check 3.x. It found this by
running the suite, not by reading its own code. 45 tests, 11 of them property-based.

What I corrected afterwards: the PBT file used `{ maxSize: n }` for array
constraints. That is the string constraint name; fast-check arrays take
`maxLength`. Tests passed at runtime because the extra key was ignored, and only
`tsc` caught it. Worth noting: **the tests were green while the types were wrong.**

**Observation to write up later:** the division of labour that worked was — Kiro
implements and self-corrects at runtime, the human runs the static checks. Neither
side caught everything alone. That is a more honest account of agentic development
than "the agent wrote it and it just worked", and judges are explicitly asked
whether there was a *strategy* to the AI development.

---

## 2026-11-14 — Tasks 4 and 5, repository and UI shell (Kiro CLI)

One run, Tasks 4 and 5. Output: `createRepository` with pre-lowercased haystacks
built once at construction, multi-word AND search, frozen results; then the full
shell — `Search`, `Record`, `Report`, `App` — with URL-driven routing (`?q=`, `?id=`,
`/report`), CSS custom-property theming from a single token object, `role="status"`
vs `role="alert"` for the reconciliation badge, and the provenance disclosure kept
in the DOM rather than conditionally mounted.

Kiro hit a type error on its own `T extends object` constraint and fixed it by
loosening to `object` and dropping a now-redundant `@ts-expect-error`. Two things
were left behind that I removed: four `index.js` files emitted into `src/` by a
`tsc` run without `noEmit`, and one of them sat next to its `.ts` twin, which is
exactly the kind of thing that resolves differently in Vite and Vitest.

Verified independently: 97 tests, 0 type errors, both apps build.

**Observation to write up later:** the constraint change is the interesting bit.
The agent removed a `@ts-expect-error` because the compiler stopped complaining —
not because the test changed. That is a small, real example of a type system and a
test suite disagreeing about what "correct" means, and of the agent trusting the
compiler over its own earlier reasoning.

### Status checkpoint

Kit is complete: contract, pipeline, report, publish guard, repository, UI shell.
97 tests green, typecheck clean, both placeholders build. Still to do: the two app
adapters and datasets (Tasks 6–7), then evidence and submission (Task 8).

---

## 2026-11-16 — Task 6, Card Catalogue (Kiro CLI)

One run, items 6.1–6.6. The interesting decision was how to represent the legacy
source: Kiro kept the fixed-width trailing spaces in the JSON rather than
pre-trimming it, so the adapter has to do the trimming the way a real dBase export
forces you to. That is the difference between a demo and a plausible artefact.

Rejection rules are narrow and defensible: missing shelfmark, blank title, and a
purely numeric date that isn't four digits. Documentary forms — `c.1893`,
`1893-1901`, `1893?` — are parsed, not rejected. A stricter adapter would have
thrown away real records, which is precisely the failure mode the report exists to
catch.

137 tests, typecheck clean, both apps build. Dataset is 2,000 records, 727 KB,
deterministic from seed `0xc0ffee42`, with the three broken rows always last.

**Observation to write up later:** the seed is committed and the generator is
committed, which means a judge can regenerate the dataset and get byte-identical
data. For a project whose entire claim is "you can verify this", reproducible input
data is not a nicety.

---

## 2026-11-16 — Task 7, Parts Ledger (Kiro CLI)

The category requires "two distinct applications", so this one had to differ by
task, not palette. It lands on a bin-range picker, not a search box: choose the row
you are walking, then step through 228 entries in A1–A9 counting each. Discrepancies
need a note and initials before they commit. The Report component is reused inline,
unforked.

Three broken rows: `QTY = 'n/a'`, a blank `BIN`, `STATUS = 'Z'`. 1,200 entries,
seed `0xdeadbe42`, generator committed.

Then I opened both apps in a browser and took screenshots. That found three things
194 green tests and a clean typecheck did not:

1. **The Search list showed only the record id.** Rows read `MAP/0001` with no
   title, author or year. Fixed in the kit by adding `renderSummary(record)` to
   `AppConfig`, so every app must say how a record presents in a list.
2. **The bin picker looked filled in but was empty.** `A1` and `A9` were
   placeholders, so the default state failed validation on first click.
3. **Title casing mangled names** — "ERNEST Of Wood Lane". Added a small-words list.

**Observation to write up later:** every one of those was visible in one screenshot
and invisible to the test suite. If there is a single honest lesson from this build,
it is that agent-written code passes its own tests and still ships an unusable
screen.
