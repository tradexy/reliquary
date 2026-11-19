/**
 * Witness's data model: the committed bundle and the derivations the screens
 * need. No hashing or signing happens here; every verdict comes from the core.
 */

import bundleJson from '@anchora/core/data/bundle.json'
import type { Anchor, AuditEvent, Seal } from '@anchora/core/chain'
import { buildCoverage } from '@anchora/core/capture'
import type { CoverageRow, KnownRefs } from '@anchora/core/capture'

export interface DemoBundle {
  formatVersion: string
  generatedAt: string
  publicKeyPem: string
  keyFingerprint: string
  events: AuditEvent[]
  seals: Seal[]
  anchors: Anchor[]
}

export const ORIGINAL: DemoBundle = bundleJson as unknown as DemoBundle

// The catalogue test file lists every action it classifies. Reading its source
// at build time (as text, never executed) lets the matrix check the same list
// the build guard checks, without a filesystem in the browser.
const TEST_FILE = 'capture/catalogue.test.ts'
const TEST_SOURCES = import.meta.glob('../../../packages/core/src/capture/catalogue.test.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export function parseKnownRefs(source: string): KnownRefs {
  const ids: string[] = []
  const pattern = /^\s*'([a-z][a-z0-9.]*)':\s*'(?:widening|tightening)'/gm
  for (const m of source.matchAll(pattern)) {
    if (m[1] !== undefined) ids.push(`${TEST_FILE}#${m[1]}`)
  }
  return new Map([[TEST_FILE, ids]])
}

export function loadCoverage(): CoverageRow[] {
  const source = Object.values(TEST_SOURCES)[0] ?? ''
  return buildCoverage(parseKnownRefs(source))
}

export interface LawfulRow {
  seq: number
  kind: string
  authority: string
  detail: string
}

/** Lawful events, with the authority the verifier would match against. */
export function lawfulRows(events: readonly AuditEvent[]): LawfulRow[] {
  return events
    .filter((e) => e.lawful !== 'none')
    .map((e) => {
      const authority = e.detail['authority']
      const rest = Object.entries(e.detail)
        .filter(([k]) => k !== 'authority')
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join('; ')
      return {
        seq: e.seq,
        kind: e.lawful,
        authority: typeof authority === 'string' ? authority : e.actor.id,
        detail: rest,
      }
    })
}
