---
inclusion: always
---

# Security steering — Anchora

This project verifies and displays untrusted audit bundles. Treat every imported bundle or event field as hostile input and every dependency as a liability.

## Non-negotiable rules

1. **No `eval`, `new Function`, `setTimeout(string)` or dynamic `import()` of a computed path.** Ever, in any package or tool.
2. **No `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML` or `document.write`.** Render text as text. Inline `<style>` and inline SVG use structured JSX or static CSS tokens only.
3. **No secrets in the repository.** No API keys, tokens or connection strings, including in tests and fixtures. `.env*` stays gitignored. Demo signing keys are derived ephemerally by scripts and never committed.
4. **No new dependency without a stated reason** in the commit message. Prefer the standard library and what is already installed.
5. **No `localStorage` or `sessionStorage` for records, bundles, reports or anything a judge needs to see.** State lives in memory or in the URL.
6. **Untrusted input never reaches a spread or `Object.assign`.** Imported JSON bundles are validated field-by-field, and `detail` holds primitives only. The capture path (`packages/core/src/capture/writers.ts`) is the single write entry point; do not add a second one.
7. **Text from data is never interpreted as markup or as a URL scheme.** No `href={record.field}` without an allowlist of schemes.
8. **Errors shown to users must not leak stack traces or file paths.** Verification reports show finding codes and reasons, not internals.

## Sealed runtime (Requirement 15)

- The apps are static: no server, no database, no telemetry, no cookies, no runtime network calls (`connect-src 'none'`).
- Fonts are self-hosted or system stacks only — never fetch external stylesheets or fonts (no Google Fonts or third-party CDNs).
- Datasets are synthetic. No personal data, no scraped records, no real names of living people.

## Reviewing a change

Before marking a task complete, answer:

1. Does this add a way for data to become code?
2. Does this add a way for data to become a URL?
3. Does this widen what the browser can do (CSP, headers, permissions, external requests)?
4. Does this add a dependency, and what does it cost to audit it?

If any answer is "yes" and the rule above does not explicitly permit it, stop and raise it instead of implementing it.

## What we do not claim

We do not claim the application is "secure" because it was written by an agent. We claim specific, testable properties: a rejecting bundle boundary, strict CSP, a dependency-free render path, static security checks, and no secrets in history. Anything stronger needs a pentest, not a README.
