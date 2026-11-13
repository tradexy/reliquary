# Requirements — Reliquary Kit

## Introduction

Reliquary is a skeleton kit for wrapping dead data sources in a modern web
interface. This spec defines the kit itself — the adapter contract, the import
pipeline and the Resurrection Report — which both shipped applications consume.

The kit exists so that a developer can bring a dead system back to life in an
afternoon and hand the owner a document proving nothing was lost.

## Requirement 1 — The adapter contract stays minimal

**User Story:** As a developer adopting Reliquary, I want a two-method adapter
interface, so that I can wrap an unfamiliar data format without learning a
framework.

### Acceptance Criteria

1. THE SYSTEM SHALL define a `LegacySource` interface with exactly three members:
   `count()`, `scan()` and `normalise()`.
2. WHEN a source implements the interface THE SYSTEM SHALL accept it without
   registration, configuration or subclassing.
3. IF a source's `scan()` throws partway through THEN THE SYSTEM SHALL preserve
   every record yielded before the failure and report the failure in the report.
4. THE SYSTEM SHALL NOT require network access to run an import.

## Requirement 2 — Every row is accounted for

**User Story:** As an archivist, I want a reconciliation of every source row, so
that I can sign off on a migration without trusting the developer.

### Acceptance Criteria

1. WHEN an import completes THE SYSTEM SHALL produce a `ResurrectionReport`.
2. THE REPORT SHALL contain `rowsIn`, `rowsOut`, `rejected` and `unmappedFields`.
3. THE SYSTEM SHALL guarantee `rowsIn = rowsOut + rejected.length`; IF this
   equality fails THEN THE SYSTEM SHALL mark the report as `inconsistent` and
   refuse to publish the dataset.
4. WHEN a row cannot be normalised THE SYSTEM SHALL record it with its source
   reference and a human-readable reason.
5. THE SYSTEM SHALL NOT discard a row for any reason other than an explicit
   rejection with a recorded reason.

## Requirement 3 — Field mapping is visible

**User Story:** As an archivist, I want to see which legacy columns became which
modern fields, so that I can spot a mis-mapping before it matters.

### Acceptance Criteria

1. THE REPORT SHALL list every source field and the record field it maps to.
2. IF a source field has no destination THEN THE SYSTEM SHALL list it under
   `unmappedFields` rather than dropping it silently.
3. IF a destination field has no source THEN THE SYSTEM SHALL list it under
   `synthesisedFields` with the default value used.

## Requirement 4 — Losslessness is a tested invariant

**User Story:** As a developer, I want property-based tests over the contract, so
that "nothing was lost" is verified rather than asserted.

### Acceptance Criteria

1. FOR ALL generated sources, `scan()` SHALL yield exactly `count()` rows.
2. FOR ALL generated rows, `normalise()` SHALL either return a record preserving
   the source identifier, or a rejection carrying that identifier.
3. FOR ALL generated sources, normalised records SHALL have unique identifiers.
4. FOR ALL generated sources, the report SHALL satisfy the reconciliation equation
   in Requirement 2.3.

## Requirement 5 — One shell, three screens

**User Story:** As a developer, I want a ready-made interface, so that I spend my
time on the data rather than the layout.

### Acceptance Criteria

1. THE KIT SHALL provide Search, Record and Report screens as reusable components.
2. WHEN a user types in Search THE SYSTEM SHALL filter on the fields declared
   searchable by the app.
3. WHEN a user opens a record THE SYSTEM SHALL reflect the selection in the URL.
4. WHEN a record has unmapped or synthesised fields THE SYSTEM SHALL surface them
   on the Record screen under a "provenance" disclosure.
5. THE KIT SHALL expose theming through a single token object; apps SHALL NOT
   override component internals.

## Requirement 6 — Two apps prove versatility

**User Story:** As a judge, I want to see the same foundation produce two genuinely
different products, so that I believe the template is reusable.

### Acceptance Criteria

1. THE REPOSITORY SHALL contain two applications in separate folders under `apps/`.
2. THE TWO APPLICATIONS SHALL share the kit package and SHALL NOT duplicate its
   components.
3. THE TWO APPLICATIONS SHALL differ in domain, data shape, visual theme and
   primary user task.
4. EACH APPLICATION SHALL run with a single documented command.

## Requirement 7 — Runs without ceremony

**User Story:** As a judge or developer, I want to run the project immediately, so
that I can evaluate it without a setup session.

### Acceptance Criteria

1. WHEN a user runs `npm install && npm run dev:cards` THE SYSTEM SHALL serve the
   Card Catalogue locally.
2. THE SYSTEM SHALL require no API keys, accounts or external services.
3. THE SYSTEM SHALL build to static assets deployable to any static host.

## Requirement 8 — Accessibility baseline

**User Story:** As an archivist using a work laptop with a small screen, I want the
app to be readable and keyboard-operable.

### Acceptance Criteria

1. THE SYSTEM SHALL meet WCAG 2.2 AA contrast for text and interactive elements.
2. THE SYSTEM SHALL be fully operable by keyboard, including search and record
   navigation.
3. THE SYSTEM SHALL respect `prefers-reduced-motion`.
