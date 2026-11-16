import { describe, it, expect } from 'vitest'
import { unsafeKeys, UNSAFE_KEYS } from './guard.js'
import { runPipeline } from './pipeline.js'
import type { LegacySource, RawRow, Normalised, Rejected } from '../contract/types.js'

/** A source that yields whatever rows it is given, normalising them verbatim. */
function sourceOf(rows: RawRow[]): LegacySource<RawRow> {
  return {
    count: async () => rows.length,
    scan: async function* () {
      for (const row of rows) yield row
    },
    normalise(raw: RawRow): Normalised<RawRow> | Rejected {
      return {
        kind: 'normalised',
        record: raw,
        mappedFields: Object.keys(raw).map((field) => ({
          sourceField: field,
          normalisedField: field,
        })),
        unmappedFields: [],
        synthesisedFields: [],
      }
    },
  }
}

describe('unsafeKeys', () => {
  it('detects __proto__', () => {
    // Object literals do not create an own "__proto__" key; JSON.parse does, and
    // that is how a hostile export would arrive.
    const row = JSON.parse('{"__proto__":"x","name":"ok"}') as RawRow
    expect(unsafeKeys(row)).toEqual(['__proto__'])
  })

  it('detects constructor and prototype', () => {
    expect(unsafeKeys({ constructor: 'a', prototype: 'b' } as unknown as RawRow)).toEqual([
      'constructor',
      'prototype',
    ])
  })

  it('is case insensitive', () => {
    expect(unsafeKeys({ __PROTO__: 'x' } as unknown as RawRow)).toEqual(['__PROTO__'])
  })

  it('returns an empty array for ordinary rows', () => {
    expect(unsafeKeys({ SHELFMARK: 'A1', TITLE: 'Deed' })).toEqual([])
  })

  it('exposes exactly the three dangerous names', () => {
    expect([...UNSAFE_KEYS].sort()).toEqual(['__proto__', 'constructor', 'prototype'])
  })
})

describe('pipeline rejects prototype-polluting rows', () => {
  it('rejects rather than discarding, and keeps the reconciliation equation', async () => {
    const rows: RawRow[] = [
      { SHELFMARK: 'A1', TITLE: 'Deed' },
      JSON.parse('{"SHELFMARK":"A2","TITLE":"Map","__proto__":"polluted"}') as RawRow,
      { SHELFMARK: 'A3', TITLE: 'Letter' },
    ]

    const { report, records } = await runPipeline(sourceOf(rows), 'Test', '2026-01-01T00:00:00Z')

    expect(records).toHaveLength(2)
    expect(report.rejected).toHaveLength(1)
    expect(report.rejected[0]?.reason).toMatch(/unsafe field/i)
    expect(report.rowsIn).toBe(report.rowsOut + report.rejected.length)
    expect(report.status).toBe('lossless')
  })

  it('does not pollute Object.prototype', async () => {
    const rows: RawRow[] = [
      JSON.parse('{"SHELFMARK":"A1","__proto__":{"pollutedFlag":true}}') as RawRow,
    ]
    await runPipeline(sourceOf(rows), 'Test', '2026-01-01T00:00:00Z')
    expect(({} as Record<string, unknown>)['pollutedFlag']).toBeUndefined()
  })
})
