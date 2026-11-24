---
inclusion: always
---

# Security steering — Reliquary

This project processes untrusted legacy exports. Treat every row as hostile input
and every dependency as a liability.

## Non-negotiable rules

1. **No `eval`, `new Function`, `setTimeout(string)` or dynamic `import()` of a
   computed path.** Ever, in any package.
2. **No `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML` or `document.write`.**
   Render text as text. If rich text is ever needed, it goes through an explicit
   allowlist sanitiser, never a regex.
3. **No secrets in the repository.** No API keys, tokens or connection strings,
   including in tests and fixtures. `.env*` stays gitignored.
4. **No new dependency without a stated reason** in the commit message and the PR
   description. Prefer the standard library and what is already installed.
5. **No `localStorage` or `sessionStorage` for records, reports or anything a judge
   needs to see.** State lives in memory or in the URL.
6. **Untrusted input never reaches a spread or `Object.assign`.** Event payloads are
   parsed defensively, and `detail` holds primitives only. The capture path
   (`packages/core/src/capture/writers.ts`) is the single write entry point; do not add a
   second one.
7. **Text from data is never interpreted as markup or as a URL scheme.** No
   `href={record.field}` without an allowlist of schemes.
8. **Errors shown to users must not leak stack traces or file paths.** The report
   shows rejection *reasons*, not internals.

## Data handling

- The apps are static: no server, no database, no telemetry, no cookies.
- Datasets are synthetic. No personal data, no scraped records, no real names of
  living people.
- The only outbound requests are Google Fonts at load time. Keep it that way; if a
  font is added, it is self-hosted instead.

## Reviewing a change

Before marking a task complete, answer:

1. Does this add a way for data to become code?
2. Does this add a way for data to become a URL?
3. Does this widen what the browser can do (CSP, headers, permissions)?
4. Does this add a dependency, and what does it cost to audit it?

If any answer is "yes" and the rule above does not explicitly permit it, stop and
raise it instead of implementing it.

## What we do not claim

We do not claim the application is "secure" because it was written by an agent.
We claim specific, testable properties: a rejecting import boundary, a content
security policy, a dependency-free render path, and no secrets in history. Anything
stronger needs a pentest, not a README.
