/**
 * Unit tests for simulateLossyImport.
 *
 * Invariants:
 *   - A lossless report becomes inconsistent (rowsOut decremented breaks the equation).
 *   - rowsOut floors at 0 — never negative.
 *   - The input report is not mutated.
 *   - A report already inconsistent remains inconsistent.
 */

import { describe, it, expect } from 'vitest'
import { simulateLossyImport } from './simulate.js'
import { buildReport } from './report.js'
import type { ResurrectionReport } from '../contract/types.js'

const LOSSLESS = buildReport({
  sourceName: 'test-source',
  importedAt: '2024-10-31T00:00:00.000Z',
  rowsIn: 5,
  rowsOut: 5,
  rejected: [],
  fieldMappings: [],
  unmappedFields: [],
  synthesisedFields: [],
})

const ALREADY_INCONSISTENT: ResurrectionReport = {
  sourceName: 'broken-source',
  importedAt: '2024-10-31T00:00:00.000Z',
  rowsIn: 10,
  rowsOut: 7,
  rejected: [],
  fieldMappings: [],
  unmappedFields: [],
  synthesisedFields: [],
  // rowsIn(10) ≠ rowsOut(7) + rejected(0) → inconsistent
  status: 'inconsistent',
}

describe('simulateLossyImport', () => {
  it('a lossless report becomes inconsistent after simulation', () => {
    const result = simulateLossyImport(LOSSLESS)
    expect(result.status).toBe('inconsistent')
  })

  it('rowsOut is decremented by one', () => {
    const result = simulateLossyImport(LOSSLESS)
    expect(result.rowsOut).toBe(LOSSLESS.rowsOut - 1)
  })

  it('rowsOut floors at 0 when input rowsOut is already 0', () => {
    const zeroOut = buildReport({
      sourceName: 'empty',
      importedAt: '2024-10-31T00:00:00.000Z',
      rowsIn: 0,
      rowsOut: 0,
      rejected: [],
      fieldMappings: [],
      unmappedFields: [],
      synthesisedFields: [],
    })
    const result = simulateLossyImport(zeroOut)
    expect(result.rowsOut).toBe(0)
  })

  it('does not mutate the input report', () => {
    const before = { ...LOSSLESS }
    simulateLossyImport(LOSSLESS)
    expect(LOSSLESS.rowsOut).toBe(before.rowsOut)
    expect(LOSSLESS.status).toBe(before.status)
  })

  it('a report that was already inconsistent stays inconsistent', () => {
    const result = simulateLossyImport(ALREADY_INCONSISTENT)
    expect(result.status).toBe('inconsistent')
  })

  it('all other fields pass through unchanged', () => {
    const result = simulateLossyImport(LOSSLESS)
    expect(result.sourceName).toBe(LOSSLESS.sourceName)
    expect(result.importedAt).toBe(LOSSLESS.importedAt)
    expect(result.rowsIn).toBe(LOSSLESS.rowsIn)
    expect(result.rejected).toBe(LOSSLESS.rejected)
    expect(result.fieldMappings).toBe(LOSSLESS.fieldMappings)
  })
})
