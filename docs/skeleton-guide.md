# Skeleton Crew Guide — Extending `@anchora/core`

Anchora is structured as a **Skeleton Crew** foundation: one reusable evidence core (`packages/core`) powering two distinct applications (`apps/seal` and `apps/witness`), an offline verifier CLI (`tools/verify`), and an offline Kiro MCP server (`tools/mcp`).

This guide shows how to add a **third** domain application (for example, a clinical-trial dispenser or treasury-transfer console) on top of `@anchora/core` in four steps without touching any cryptography.

---

## 1. Register your domain actions in the capture catalogue

Add each new auditable action to `packages/core/src/capture/catalogue.ts`:

```ts
{
  id: 'treasury.wire.release',
  area: 'governance',
  failMode: 'fail-closed', // widening: must refuse if audit store is down
  description: 'A wire transfer batch is released.',
  testRef: 'capture/catalogue.test.ts#treasury.wire.release',
}
```

Then classify it in `packages/core/src/capture/catalogue.test.ts` under `EXPECTED`. If you forget the test entry, the coverage guard fails the build (`npm run verify`) and Witness flags the gap.

## 2. Add domain compliance predicates

Add a plain-data control predicate in `packages/core/src/evidence/standards.ts` so every compliance claim resolves directly to verified `seq` numbers:

```ts
{
  standard: 'SOC 2',
  control: 'CC9.2',
  statement: 'Treasury batch releases are recorded before execution.',
  query: (e) => e.outcome !== 'refused' && e.action === 'treasury.wire.release',
}
```

## 3. Define a Theme and compose your app under `apps/<name>/`

Pass your own `Theme` object to `AppShell` and reuse `Panel`, `Table`, `Badge`, `ControlPanel`, and `FindingList` from `@anchora/core/ui`:

```tsx
import { AppShell, Panel, Badge, sealTheme } from '@anchora/core/ui'
import { createCapture, CATALOGUE } from '@anchora/core/capture'
import { createLog, verifyChain } from '@anchora/core/chain'

const treasuryTheme = {
  ...sealTheme,
  name: 'treasury',
  colors: { ...sealTheme.colors, accent: '#d6a85a' },
}
```

## 4. Install the Anchora Kiro Power (optional)

Point Kiro at [`.kiro/powers/anchora/`](../.kiro/powers/anchora/POWER.md) to get the offline `anchora` MCP tools (`verify_bundle`, `inspect_seq`, `check_coverage`, `check_compliance`) and fail-closed steering rules automatically while building your app.
