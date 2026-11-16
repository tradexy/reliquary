/**
 * Tests for the CSV export utility.
 *
 * Covers:
 *   - escapeCsvField: commas, double-quotes, newlines, plain values.
 *   - reportToCsv: structure, header fields, rejection rows, RFC 4180 escaping.
 */

import { describe, it, expect } from 'vitest'
import { escapeCsvField, reportToCsv } from './export.js'
import type { ResurrectionReport } from '../contract/types.js'

// ── escapeCsvField ────────────────────────────────────────────────────────

describe('escapeCsvField', () => {
  it('returns a plain value unchanged', () => {
    expect(escapeCsvField('hello')).toBe('hello')
    expect(escapeCsvField('1893')).toBe('1893')
    expect(escapeCsvField('')).toBe('')
  })

  it('wraps a value that contains a comma', () => {
    expect(escapeCsvField('Smith, John')).toBe('"Smith, John"')
  })

  it('wraps a value that contains a double-quote and doubles the quote', () => {
    expect(escapeCsvField('He said "hello"')).toBe('"He said ""hello"""')
  })

  it('wraps a value that contains a newline', () => {
    expect(escapeCsvField('line one\nline two')).toBe('"line one\nline two"')
  })

  it('wraps a value that contains a carriage return', () => {
    expect(escapeCsvField('line one\rline two')).toBe('"line one\rline two"')
  })

  it('handles a value with both commas and quotes', () => {
    // CSV injection concern: "She said ""hello, world"""
    const result = escapeCsvField('She said "hello, world"')
    expect(result).toBe('"She said ""hello, world"""')
  })

  it('handles a value that is only double-quotes', () => {
    // Input: "" (2 quotes). Each doubled → "" "" (4 quotes). Wrapped → """""" (6 quotes).
    expect(escapeCsvField('""')).toBe('""""""')
  })
})

// ── reportToCsv ───────────────────────────────────────────────────────────

function makeReport(overrides: Partial<ResurrectionReport> = {}): ResurrectionReport {
  return {
    sourceName: 'Test Source',
    importedAt: '2024-06-01T12:00:00.000Z',
    rowsIn: 10,
    rowsOut: 8,
    rejected: [],
    fieldMappings: [
      { sourceField: 'NAME', normalisedField: 'name' },
      { sourceField: 'DATE', normalisedField: 'year' },
    ],
    unmappedFields: ['EXTRA'],
    synthesisedFields: ['slug'],
    status: 'lossless',
    ...overrides,
  }
}

describe('reportToCsv', () => {
  it('produces a non-empty string', () => {
    const csv = reportToCsv(makeReport())
    expect(typeof csv).toBe('string')
    expect(csv.length).toBeGreaterThan(0)
  })

  it('includes the source name in the output', () => {
    const csv = reportToCsv(makeReport({ sourceName: 'My Archive' }))
    expect(csv).toContain('My Archive')
  })

  it('includes the status in the output', () => {
    const csv = reportToCsv(makeReport({ status: 'inconsistent' }))
    expect(csv).toContain('inconsistent')
  })

  it('includes row counts', () => {
    const csv = reportToCsv(makeReport({ rowsIn: 42, rowsOut: 40 }))
    expect(csv).toContain('42')
    expect(csv).toContain('40')
  })

  it('includes a blank separator line between sections', () => {
    const csv = reportToCsv(makeReport())
    // A blank separator means two consecutive newlines
    expect(csv).toContain('\n\n')
  })

  it('renders rejection rows with sourceRef and reason', () => {
    const report = makeReport({
      rowsIn: 3,
      rowsOut: 2,
      rejected: [
        { kind: 'rejected', sourceRef: 'Row 3', reason: 'Missing shelfmark' },
      ],
      status: 'lossless',
    })
    const csv = reportToCsv(report)
    expect(csv).toContain('Row 3')
    expect(csv).toContain('Missing shelfmark')
  })

  it('escapes commas inside rejection reasons', () => {
    const report = makeReport({
      rowsIn: 2,
      rowsOut: 1,
      rejected: [
        {
          kind: 'rejected',
          sourceRef: 'Shelfmark LH/0001',
          reason: 'Invalid DATE "18999", expected format: YYYY or c.YYYY',
        },
      ],
      status: 'lossless',
    })
    const csv = reportToCsv(report)
    // The reason contains a comma so the field must be quoted.
    expect(csv).toContain('"Invalid DATE ""18999"", expected format: YYYY or c.YYYY"')
  })

  it('escapes double-quotes inside source names', () => {
    const csv = reportToCsv(makeReport({ sourceName: 'Archive "Beta" Source' }))
    expect(csv).toContain('"Archive ""Beta"" Source"')
  })

  it('renders (none) in the rejections section when there are no rejections', () => {
    const csv = reportToCsv(makeReport({ rejected: [] }))
    expect(csv).toContain('(none)')
  })

  it('lines are separated by newlines (not CRLF)', () => {
    const csv = reportToCsv(makeReport())
    // We use \n throughout. Verify no Windows line endings crept in.
    expect(csv).not.toContain('\r\n')
  })

  it('the header row is Field,Value', () => {
    const csv = reportToCsv(makeReport())
    expect(csv.startsWith('Field,Value\n')).toBe(true)
  })
})
