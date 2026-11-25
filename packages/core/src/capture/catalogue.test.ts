import { describe, it, expect } from 'vitest'
import { CATALOGUE } from './catalogue.js'
import type { FailMode } from './catalogue.js'
import { buildCoverage } from './coverage.js'

const FILE = 'capture/catalogue.test.ts'

// Rule: widening actions fail closed, tightening actions queue.
const EXPECTED: Record<string, 'widening' | 'tightening'> = {
  'identity.user.invite': 'widening',
  'identity.user.suspend': 'tightening',
  'identity.user.reactivate': 'widening',
  'roles.grant': 'widening',
  'roles.revoke': 'tightening',
  'agents.deploy': 'widening',
  'agents.disable': 'tightening',
  'agents.guardrail.ceiling.raise': 'widening',
  'agents.guardrail.ceiling.lower': 'tightening',
  'agents.decision.record': 'widening',
  'routing.connector.add': 'widening',
  'routing.connector.remove': 'tightening',
  'settings.feature.enable': 'widening',
  'settings.feature.disable': 'tightening',
  'governance.policy.update': 'widening',
}

const MODE: Record<'widening' | 'tightening', FailMode> = {
  widening: 'fail-closed',
  tightening: 'queue',
}

// Hand-maintained: adding a catalogue action without adding it here fails the guard.
const KNOWN_REFS: ReadonlyMap<string, readonly string[]> = new Map([
  [FILE, Object.keys(EXPECTED).map((id) => `${FILE}#${id}`)],
])

describe('catalogue fail modes', () => {
  for (const entry of CATALOGUE) {
    it(`${FILE}#${entry.id}`, () => {
      const kind = EXPECTED[entry.id]
      expect(kind, `classify ${entry.id} as widening or tightening`).toBeDefined()
      expect(entry.failMode).toBe(MODE[kind!])
    })
  }
})

describe('coverage guard', () => {
  it('every catalogue action has a known test ref', () => {
    const missing = buildCoverage(KNOWN_REFS).filter((row) => !row.tested)
    expect(missing.map((row) => row.id)).toEqual([])
  })

  it('has no known ref for an action that left the catalogue', () => {
    const ids = new Set(CATALOGUE.map((e) => e.id))
    expect(Object.keys(EXPECTED).filter((id) => !ids.has(id))).toEqual([])
  })

  it('fails when a catalogue action has no entry in the known-refs map', () => {
    const extra = [
      ...CATALOGUE,
      {
        id: 'roles.escalate',
        area: 'roles' as const,
        failMode: 'fail-closed' as const,
        description: 'test-only',
        testRef: `${FILE}#roles.escalate`,
      },
    ]
    const rows = buildCoverage(KNOWN_REFS, extra)
    const row = rows.find((r) => r.id === 'roles.escalate')
    expect(row?.tested).toBe(false)
    expect(row?.gap).toContain('roles.escalate')
    expect(rows.filter((r) => !r.tested)).toHaveLength(1)
  })

  it('reports a gap when the test file is unknown', () => {
    const rows = buildCoverage(new Map())
    expect(rows.every((r) => !r.tested && r.gap !== null)).toBe(true)
  })

  it('returns one row per catalogue entry, in order', () => {
    expect(buildCoverage(KNOWN_REFS).map((r) => r.id)).toEqual(CATALOGUE.map((e) => e.id))
  })
})
