# Threat model

Scope: the two static web apps and the import pipeline that prepares their data.
Out of scope: the developer's machine, the GitHub account, Kiro itself.

## Assets

| Asset | Why it matters |
| --- | --- |
| Source rows | The only copy of a dead system's data. Losing one silently is the failure this project exists to prevent. |
| The Resurrection Report | It is the evidence an archivist signs. If it can lie, the whole product is theatre. |
| The browser session | Read-only static pages; no accounts, no credentials, nothing to steal. |
| Build integrity | A compromised dependency or workflow could alter what is deployed. |

## Threats

| # | Threat | Vector | Control | Verified by |
| --- | --- | --- | --- | --- |
| T1 | Prototype pollution | A hostile export carries a `__proto__` / `constructor` / `prototype` field name | Pipeline rejects the row with a reason; nothing is spread | `import/guard.test.ts` |
| T2 | Silent data loss | Adapter miscalculates or `count()` lies | Reconciliation equation; `publish()` throws on mismatch | `import/pipeline.pbt.test.ts`, `publish` tests |
| T3 | Report falsification | A caller sets `status` by hand | `status` is computed, never assigned | `import/report.test` (via pipeline suite) |
| T4 | XSS via record data | A title or note containing markup | No `dangerouslySetInnerHTML`; text rendered as text; CSP blocks inline script | `scripts/security-check.mjs`, CSP in build |
| T5 | Malicious link in data | A record field used as `href` | No data-driven URLs anywhere; links are static | review + security scan |
| T6 | Credential leak | A key committed in source or fixtures | Static scan for AWS/GitHub/OpenAI key shapes; `.env*` gitignored | `scripts/security-check.mjs` |
| T7 | Supply-chain change | A new dependency added mid-task | No-dependency rule in steering; dependency list is small and pinned by lockfile | review, `package-lock.json` |
| T8 | Deployed artefact drift | Local build differs from what judges see | CI builds and deploys from `main`, tests run before deploy | `.github/workflows/deploy.yml` |

## Residual risk

- **No server-side controls.** There is no server, so there is no auth, session or
  injection surface — and no rate limiting or audit log either.
- **Static analysis only.** `security-check.mjs` catches known-bad patterns, not
  logic flaws. It is a floor, not a certificate.
- **Fonts are third-party.** Google Fonts is the only outbound request. Self-hosting
  would remove it; it is on the list, not done.
- **No penetration test.** We claim specific tested properties, not general
  security.

## What would change if this went to production

Server-side import for large files, signed reports (hash of the source file plus
the record count), authentication for the archivist, and a real dependency audit
pipeline. None of that belongs in a three-week build, and pretending otherwise
would be the dishonest move.
