/**
 * Unit tests for the import pipeline, report builder, and publish guard.
 *
 * These tests verify concrete, deterministic behaviour. The property-based
 * invariants live in pipeline.pbt.test.ts.
 */

import { describe, it, expect } from 'vitest'
import { runPipeline } from './pipeline.js'
import { buildReport, isLossless } from './report.js'
import { publish, InconsistentReportError } from './publish.js'
import type { LegacySource, RawRow, Normalised, Rejected } from '../contract/types.js'

const FIXED_AT = '2024-10-31T00:00:00.000Z'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SimpleRecord = { id: string; name: string }

/** Build a source from a fixed array of rows, with a configurable normaliser. */
function makeSource(
  rows: RawRow[],
  normalise: (raw: RawRow) => Normalised<SimpleRecord> | Rejected,
  reportedCount?: number,
): LegacySource<SimpleRecord> {
  return {
    count: async () => reportedCount ?? rows.length,
    scan: async function* () {
      for (const row of rows) yield row
    },
    normalise,
  }
}

function goodNormalise(raw: RawRow): Normalised<SimpleRecord> | Rejected {
  const id = raw['id']
  const name = raw['name']
  if (typeof id !== 'string' || typeof name !== 'string') {
    return {
      kind: 'rejected',
      sourceRef: String(raw['id'] ?? '(none)'),
      reason: 'missing id or name',
    }
  }
  return {
    kind: 'normalised',
    record: { id, name },
    mappedFields: [
      { sourceField: 'id', normalisedField: 'id' },
      { sourceField: 'name', normalisedField: 'name' },
    ],
    unmappedFields: ['legacy_notes'],
    synthesisedFields: [],
  }
}

// ---------------------------------------------------------------------------
// runPipeline
// ---------------------------------------------------------------------------

describe('runPipeline', () => {
  it('processes an empty source into a lossless report with zero records', async () => {
    const source = makeSource([], goodNormalise)
    const { report, records } = await runPipeline(source, 'test-empty', FIXED_AT)

    expect(records).toHaveLength(0)
    expect(report.rowsIn).toBe(0)
    expect(report.rowsOut).toBe(0)
    expect(report.rejected).toHaveLength(0)
    expect(report.status).toBe('lossless')
  })

  it('converts all-valid rows into records with lossless status', async () => {
    const rows: RawRow[] = [
      { id: 'a1', name: 'Skull', legacy_notes: 'fragile' },
      { id: 'a2', name: 'Femur', legacy_notes: null },
    ]
    const source = makeSource(rows, goodNormalise)
    const { report, records } = await runPipeline(source, 'test-valid', FIXED_AT)

    expect(records).toHaveLength(2)
    expect(report.rowsIn).toBe(2)
    expect(report.rowsOut).toBe(2)
    expect(report.rejected).toHaveLength(0)
    expect(report.status).toBe('lossless')
  })

  it('separates rejections from records without losing them', async () => {
    const rows: RawRow[] = [
      { id: 'b1', name: 'Tibia' },
      { id: null, name: 'Unknown' },   // will be rejected
      { id: 'b3', name: 'Radius' },
    ]
    const source = makeSource(rows, goodNormalise)
    const { report, records } = await runPipeline(source, 'test-mixed', FIXED_AT)

    expect(records).toHaveLength(2)
    expect(report.rejected).toHaveLength(1)
    expect(report.rejected[0]?.sourceRef).toBe('(none)')
    expect(report.rowsIn).toBe(3)
    expect(report.rowsOut).toBe(2)
    expect(report.status).toBe('lossless')
  })

  it('handles all rows rejected — still lossless if count matches', async () => {
    const rows: RawRow[] = [
      { id: null, name: 'x' },
      { id: null, name: 'y' },
    ]
    const source = makeSource(rows, goodNormalise)
    const { report, records } = await runPipeline(source, 'test-all-rejected', FIXED_AT)

    expect(records).toHaveLength(0)
    expect(report.rejected).toHaveLength(2)
    expect(report.status).toBe('lossless')
  })

  it('produces inconsistent status when count() over-reports scan() rows', async () => {
    const rows: RawRow[] = [{ id: 'c1', name: 'Clavicle' }]
    // count says 5, scan yields 1
    const source = makeSource(rows, goodNormalise, 5)
    const { report } = await runPipeline(source, 'test-over-report', FIXED_AT)

    expect(report.status).toBe('inconsistent')
    expect(report.rowsIn).toBe(5)
    expect(report.rowsOut).toBe(1)
  })

  it('produces inconsistent status when count() under-reports scan() rows', async () => {
    const rows: RawRow[] = [
      { id: 'd1', name: 'Humerus' },
      { id: 'd2', name: 'Ulna' },
    ]
    // count says 1, scan yields 2
    const source = makeSource(rows, goodNormalise, 1)
    const { report } = await runPipeline(source, 'test-under-report', FIXED_AT)

    expect(report.status).toBe('inconsistent')
  })

  it('stamps the report with the injected importedAt timestamp', async () => {
    const source = makeSource([], goodNormalise)
    const { report } = await runPipeline(source, 'ts-check', '2099-01-01T12:00:00.000Z')
    expect(report.importedAt).toBe('2099-01-01T12:00:00.000Z')
  })

  it('stamps the report with the given source name', async () => {
    const source = makeSource([], goodNormalise)
    const { report } = await runPipeline(source, 'my-source-name', FIXED_AT)
    expect(report.sourceName).toBe('my-source-name')
  })

  it('accumulates field mappings from all rows, deduplicated by source field', async () => {
    const rows: RawRow[] = [
      { id: 'e1', name: 'Patella' },
      { id: 'e2', name: 'Fibula' },
    ]
    const source = makeSource(rows, goodNormalise)
    const { report } = await runPipeline(source, 'field-dedup', FIXED_AT)

    // Both rows map 'id' and 'name'; the report should have exactly 2 entries.
    expect(report.fieldMappings).toHaveLength(2)
    expect(report.fieldMappings.map((m) => m.sourceField).sort()).toEqual(['id', 'name'])
  })

  it('accumulates unmapped fields across all rows', async () => {
    const rows: RawRow[] = [
      { id: 'f1', name: 'Scapula', legacy_notes: 'old' },
      { id: 'f2', name: 'Sternum', legacy_notes: null },
    ]
    const source = makeSource(rows, goodNormalise)
    const { report } = await runPipeline(source, 'unmapped-fields', FIXED_AT)

    expect(report.unmappedFields).toContain('legacy_notes')
  })

  it('throws if the adapter fails the conformance guard', async () => {
    // Cast through unknown to simulate a misconfigured adapter arriving at runtime.
    const bad = { count: 42 } as unknown as LegacySource<SimpleRecord>
    await expect(runPipeline(bad, 'bad-adapter', FIXED_AT)).rejects.toThrow(TypeError)
  })

  it('accumulates synthesised fields across all rows', async () => {
    const rows: RawRow[] = [{ id: 'g1', name: 'Coccyx' }]
    const sourceWithSynthesis = makeSource(rows, (raw) => {
      const id = raw['id']
      const name = raw['name']
      if (typeof id !== 'string' || typeof name !== 'string') {
        return { kind: 'rejected', sourceRef: '?', reason: 'bad' }
      }
      return {
        kind: 'normalised',
        record: { id, name },
        mappedFields: [{ sourceField: 'id', normalisedField: 'id' }],
        unmappedFields: [],
        synthesisedFields: [{ field: 'slug', value: `${id}-${name.toLowerCase()}` }],
      }
    })
    const { report } = await runPipeline(sourceWithSynthesis, 'synth', FIXED_AT)
    expect(report.synthesisedFields).toContain('slug')
  })
})

// ---------------------------------------------------------------------------
// buildReport
// ---------------------------------------------------------------------------

describe('buildReport', () => {
  it('sets status to lossless when rowsIn === rowsOut + rejected.length', () => {
    const report = buildReport({
      sourceName: 'x',
      importedAt: FIXED_AT,
      rowsIn: 10,
      rowsOut: 8,
      rejected: [
        { kind: 'rejected', sourceRef: 'r1', reason: 'bad' },
        { kind: 'rejected', sourceRef: 'r2', reason: 'bad' },
      ],
      fieldMappings: [],
      unmappedFields: [],
      synthesisedFields: [],
    })
    expect(report.status).toBe('lossless')
  })

  it('sets status to inconsistent when the equation fails', () => {
    const report = buildReport({
      sourceName: 'x',
      importedAt: FIXED_AT,
      rowsIn: 10,
      rowsOut: 7,   // 7 + 2 = 9, not 10
      rejected: [
        { kind: 'rejected', sourceRef: 'r1', reason: 'bad' },
        { kind: 'rejected', sourceRef: 'r2', reason: 'bad' },
      ],
      fieldMappings: [],
      unmappedFields: [],
      synthesisedFields: [],
    })
    expect(report.status).toBe('inconsistent')
  })

  it('is lossless for the zero-row edge case', () => {
    const report = buildReport({
      sourceName: 'empty',
      importedAt: FIXED_AT,
      rowsIn: 0,
      rowsOut: 0,
      rejected: [],
      fieldMappings: [],
      unmappedFields: [],
      synthesisedFields: [],
    })
    expect(report.status).toBe('lossless')
  })
})

describe('isLossless', () => {
  it('returns true for a lossless report', () => {
    const report = buildReport({
      sourceName: 'x', importedAt: FIXED_AT,
      rowsIn: 1, rowsOut: 1, rejected: [],
      fieldMappings: [], unmappedFields: [], synthesisedFields: [],
    })
    expect(isLossless(report)).toBe(true)
  })

  it('returns false for an inconsistent report', () => {
    const report = buildReport({
      sourceName: 'x', importedAt: FIXED_AT,
      rowsIn: 2, rowsOut: 1, rejected: [],   // delta = 1
      fieldMappings: [], unmappedFields: [], synthesisedFields: [],
    })
    expect(isLossless(report)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// publish
// ---------------------------------------------------------------------------

describe('publish', () => {
  it('passes through a lossless result unchanged', async () => {
    const rows: RawRow[] = [{ id: 'p1', name: 'Maxilla' }]
    const source = makeSource(rows, goodNormalise)
    const result = await runPipeline(source, 'publish-ok', FIXED_AT)

    const published = publish(result)
    expect(published).toBe(result)   // same reference — no copy
    expect(published.report.status).toBe('lossless')
  })

  it('throws InconsistentReportError for an inconsistent result', async () => {
    const rows: RawRow[] = [{ id: 'p2', name: 'Mandible' }]
    const source = makeSource(rows, goodNormalise, 99)  // count lies
    const result = await runPipeline(source, 'publish-fail', FIXED_AT)

    expect(() => publish(result)).toThrow(InconsistentReportError)
  })

  it('error message contains source name, rowsIn, rowsOut and rejected count', async () => {
    const rows: RawRow[] = [{ id: 'q1', name: 'Sacrum' }]
    const source = makeSource(rows, goodNormalise, 10)
    const result = await runPipeline(source, 'my-source', FIXED_AT)

    expect(() => publish(result)).toThrow(/my-source/)
    expect(() => publish(result)).toThrow(/rowsIn=10/)
    expect(() => publish(result)).toThrow(/rowsOut=1/)
  })

  it('exposes the report on the thrown error', async () => {
    const rows: RawRow[] = [{ id: 'q2', name: 'Vertebra' }]
    const source = makeSource(rows, goodNormalise, 5)
    const result = await runPipeline(source, 'exposed-report', FIXED_AT)

    let caught: InconsistentReportError | null = null
    try {
      publish(result)
    } catch (e) {
      caught = e as InconsistentReportError
    }
    expect(caught).not.toBeNull()
    expect(caught?.report.sourceName).toBe('exposed-report')
    expect(caught?.report.status).toBe('inconsistent')
  })
})
