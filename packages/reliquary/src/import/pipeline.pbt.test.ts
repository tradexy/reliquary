/**
 * Property-based test suite for the import pipeline.
 *
 * These tests cover Requirements 2 and 4 from the spec:
 *
 *   Req 2 — scan() length equals count() for any generated source.
 *   Req 4 — rowsIn === rowsOut + rejected.length for any mix of valid/broken rows,
 *            including all-broken and empty.
 *
 * Additional invariants derived from the design:
 *   - Every normalised record keeps its source identifier intact.
 *   - Identifiers are unique after normalisation (no duplicate IDs).
 *   - publish() throws if and only if the report is inconsistent.
 *   - buildReport() status is deterministic from the three counts alone.
 *
 * The seed and numRuns are set globally in vitest.setup.ts from PBT_RUNS env var.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { runPipeline } from './pipeline.js'
import { buildReport } from './report.js'
import { publish, InconsistentReportError } from './publish.js'
import type {
  LegacySource,
  RawRow,
  Normalised,
  Rejected,
  FieldMapping,
} from '../contract/types.js'

const FIXED_AT = '2024-10-31T00:00:00.000Z'

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A non-empty string safe to use as a record identifier. */
const arbId = fc.stringMatching(/^[a-z][a-z0-9_-]{0,19}$/)

/** A single raw row with a string id and an optional numeric quantity. */
const arbValidRow: fc.Arbitrary<RawRow> = fc.record({
  id: arbId,
  label: fc.string({ minLength: 1, maxLength: 40 }),
  qty: fc.oneof(fc.integer({ min: 0, max: 9999 }), fc.constant(null)),
})

/** A broken row: id is null so our normaliser will reject it. */
const arbBrokenRow: fc.Arbitrary<RawRow> = fc.record({
  id: fc.constant(null),
  label: fc.string({ minLength: 1, maxLength: 40 }),
})

/**
 * A mix of valid and broken rows.
 * We generate each row independently as either good or bad,
 * so the mix is arbitrary (all-good, all-bad, and everything in between).
 */
const arbRowMix: fc.Arbitrary<RawRow[]> = fc.array(
  fc.oneof({ weight: 3, arbitrary: arbValidRow }, { weight: 1, arbitrary: arbBrokenRow }),
  { maxLength: 50 },
)

/** A source name string. */
const arbSourceName = fc.string({ minLength: 1, maxLength: 30 })

// ---------------------------------------------------------------------------
// Source factory
// ---------------------------------------------------------------------------

type RowRecord = { id: string; label: string; qty: number | null }

function normaliseRow(raw: RawRow): Normalised<RowRecord> | Rejected {
  const id = raw['id']
  if (typeof id !== 'string' || id.trim() === '') {
    return {
      kind: 'rejected',
      sourceRef: `row:id=${String(raw['id'] ?? '(null)')}`,
      reason: 'id is missing or not a string',
    }
  }

  const label = raw['label']
  const qty = raw['qty']

  const mappedFields: FieldMapping[] = [{ sourceField: 'id', normalisedField: 'id' }]
  if (label !== undefined) mappedFields.push({ sourceField: 'label', normalisedField: 'label' })
  if (qty !== undefined) mappedFields.push({ sourceField: 'qty', normalisedField: 'qty' })

  return {
    kind: 'normalised',
    record: {
      id,
      label: typeof label === 'string' ? label : '',
      qty: typeof qty === 'number' ? qty : null,
    },
    mappedFields,
    unmappedFields: [],
    synthesisedFields: [],
  }
}

/** Build a well-behaved source whose count() matches what scan() will yield. */
function makeHonestSource(rows: RawRow[]): LegacySource<RowRecord> {
  return {
    count: async () => rows.length,
    scan: async function* () {
      for (const row of rows) yield row
    },
    normalise: normaliseRow,
  }
}

/** Build a source whose count() deliberately returns a wrong number. */
function makeLyingSource(rows: RawRow[], lie: number): LegacySource<RowRecord> {
  return {
    count: async () => lie,
    scan: async function* () {
      for (const row of rows) yield row
    },
    normalise: normaliseRow,
  }
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('PBT — Requirement 2: scan() length equals count() for honest sources', () => {
  it('rowsIn always equals the number of rows scan() yielded (honest source)', async () => {
    await fc.assert(
      fc.asyncProperty(arbRowMix, arbSourceName, async (rows, name) => {
        const source = makeHonestSource(rows)
        const { report } = await runPipeline(source, name, FIXED_AT)
        // rowsIn is what count() said; rowsOut + rejected.length is what scan() gave.
        // For an honest source these must be equal, hence lossless.
        expect(report.rowsIn).toBe(rows.length)
        expect(report.rowsOut + report.rejected.length).toBe(rows.length)
      }),
    )
  })

  it('honest source always produces a lossless report', async () => {
    await fc.assert(
      fc.asyncProperty(arbRowMix, arbSourceName, async (rows, name) => {
        const source = makeHonestSource(rows)
        const { report } = await runPipeline(source, name, FIXED_AT)
        expect(report.status).toBe('lossless')
      }),
    )
  })

  it('empty source produces a lossless report with zero counts', async () => {
    await fc.assert(
      fc.asyncProperty(arbSourceName, async (name) => {
        const source = makeHonestSource([])
        const { report } = await runPipeline(source, name, FIXED_AT)
        expect(report.status).toBe('lossless')
        expect(report.rowsIn).toBe(0)
        expect(report.rowsOut).toBe(0)
        expect(report.rejected).toHaveLength(0)
      }),
    )
  })

  it('all-broken source is still lossless when count() matches scan() length', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbBrokenRow, { minLength: 1, maxLength: 20 }),
        arbSourceName,
        async (rows, name) => {
          const source = makeHonestSource(rows)
          const { report } = await runPipeline(source, name, FIXED_AT)
          expect(report.status).toBe('lossless')
          expect(report.rowsOut).toBe(0)
          expect(report.rejected).toHaveLength(rows.length)
        },
      ),
    )
  })
})

describe('PBT — Requirement 4: reconciliation invariant', () => {
  it('rowsIn === rowsOut + rejected.length for any honest source', async () => {
    await fc.assert(
      fc.asyncProperty(arbRowMix, arbSourceName, async (rows, name) => {
        const source = makeHonestSource(rows)
        const { report } = await runPipeline(source, name, FIXED_AT)
        expect(report.rowsIn).toBe(report.rowsOut + report.rejected.length)
      }),
    )
  })

  it('buildReport status is lossless iff rowsIn === rowsOut + rejected.length', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        (rowsIn, rowsOut, rejectedCount) => {
          const rejected = Array.from({ length: rejectedCount }, (_, i) => ({
            kind: 'rejected' as const,
            sourceRef: `r${i}`,
            reason: 'bad',
          }))
          const report = buildReport({
            sourceName: 'x',
            importedAt: FIXED_AT,
            rowsIn,
            rowsOut,
            rejected,
            fieldMappings: [],
            unmappedFields: [],
            synthesisedFields: [],
          })
          const shouldBeLossless = rowsIn === rowsOut + rejectedCount
          expect(report.status).toBe(shouldBeLossless ? 'lossless' : 'inconsistent')
        },
      ),
    )
  })

  it('publish() throws InconsistentReportError for any dishonest source', async () => {
    // A lying source: count() returns rows.length + delta (non-zero).
    await fc.assert(
      fc.asyncProperty(
        arbRowMix,
        arbSourceName,
        fc.integer({ min: 1, max: 20 }), // the lie delta — always positive so always inconsistent
        async (rows, name, delta) => {
          const source = makeLyingSource(rows, rows.length + delta)
          const result = await runPipeline(source, name, FIXED_AT)
          expect(() => publish(result)).toThrow(InconsistentReportError)
        },
      ),
    )
  })

  it('publish() passes through any honest (lossless) source', async () => {
    await fc.assert(
      fc.asyncProperty(arbRowMix, arbSourceName, async (rows, name) => {
        const source = makeHonestSource(rows)
        const result = await runPipeline(source, name, FIXED_AT)
        // Should not throw.
        const published = publish(result)
        expect(published.report.status).toBe('lossless')
      }),
    )
  })
})

describe('PBT — source identifier integrity', () => {
  it('every normalised record retains its source id unchanged', async () => {
    // Only generate valid rows so we have records to inspect.
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbValidRow, { minLength: 1, maxLength: 30 }),
        arbSourceName,
        async (rows, name) => {
          const source = makeHonestSource(rows)
          const { records } = await runPipeline(source, name, FIXED_AT)
          // Every record's id must equal the id in the original row.
          for (let i = 0; i < records.length; i++) {
            const record = records[i]
            // Find the matching source row by id.
            const sourceRow = rows.find((r) => r['id'] === record?.id)
            expect(sourceRow).toBeDefined()
            expect(record?.id).toBe(sourceRow?.['id'])
          }
        },
      ),
    )
  })

  it('no two records share an id after normalisation (uniqueness)', async () => {
    // Generate rows with unique ids so the normaliser itself does not produce
    // duplicates — this tests the pipeline's pass-through, not deduplication logic.
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(arbValidRow, {
          selector: (r) => r['id'] as string,
          maxLength: 30,
        }),
        arbSourceName,
        async (rows, name) => {
          const source = makeHonestSource(rows)
          const { records } = await runPipeline(source, name, FIXED_AT)
          const ids = records.map((r) => r.id)
          const uniqueIds = new Set(ids)
          expect(uniqueIds.size).toBe(ids.length)
        },
      ),
    )
  })
})

describe('PBT — rejected rows are never silently discarded', () => {
  it('every broken row in the input appears exactly once in the report rejections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbBrokenRow, { minLength: 1, maxLength: 20 }),
        arbSourceName,
        async (brokenRows, name) => {
          const source = makeHonestSource(brokenRows)
          const { report } = await runPipeline(source, name, FIXED_AT)
          expect(report.rejected).toHaveLength(brokenRows.length)
          // Every rejection carries a reason.
          for (const r of report.rejected) {
            expect(r.reason.length).toBeGreaterThan(0)
            expect(r.sourceRef.length).toBeGreaterThan(0)
          }
        },
      ),
    )
  })
})
