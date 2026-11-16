/**
 * Tests for the Card Catalogue source adapter.
 *
 * Covers:
 *   - Rejection of the three deliberately broken row types.
 *   - Reconciliation invariant: rowsIn === rowsOut + rejected.length.
 *   - parseDateYear and isImpossibleDate helpers.
 */

import { describe, it, expect } from 'vitest'
import { createCardSource, parseDateYear, isImpossibleDate } from './cardSource.js'
import { runPipeline } from '@reliquary/kit/import'
import type { RawRow } from '@reliquary/kit/contract'

// ── Helpers ───────────────────────────────────────────────────────────────

/** A minimal valid raw row. */
function validRow(overrides: Partial<Record<string, string>> = {}): RawRow {
  return {
    SHELFMARK: 'LH/0001     ',
    SURNAME: 'ATKINSON            ',
    FORENAMES: 'ALICE               ',
    TITLE: 'Birth certificate: ATKINSON, ALICE of HIGH STREET                              ',
    DATE: '1894        ',
    SUBJECT: 'Family history                ',
    NOTES: '                                                            ',
    ...overrides,
  }
}

// ── parseDateYear ─────────────────────────────────────────────────────────

describe('parseDateYear', () => {
  it('parses a plain four-digit year', () => {
    expect(parseDateYear('1893')).toBe(1893)
  })

  it('parses a circa date', () => {
    expect(parseDateYear('c.1893')).toBe(1893)
  })

  it('parses the first year of a range', () => {
    expect(parseDateYear('1893-1901')).toBe(1893)
  })

  it('parses a qualified year', () => {
    expect(parseDateYear('1893?')).toBe(1893)
  })

  it('returns null for a blank date', () => {
    expect(parseDateYear('')).toBeNull()
    expect(parseDateYear('   ')).toBeNull()
  })

  it('returns null when no four-digit run is present', () => {
    expect(parseDateYear('no date')).toBeNull()
  })
})

// ── isImpossibleDate ──────────────────────────────────────────────────────

describe('isImpossibleDate', () => {
  it('flags a purely-numeric string that is not exactly four digits', () => {
    expect(isImpossibleDate('18999')).toBe(true)
    expect(isImpossibleDate('189')).toBe(true)
    expect(isImpossibleDate('12345')).toBe(true)
  })

  it('accepts a plain four-digit year', () => {
    expect(isImpossibleDate('1893')).toBe(false)
  })

  it('accepts documentary date forms with non-digit characters', () => {
    expect(isImpossibleDate('c.1893')).toBe(false)
    expect(isImpossibleDate('1893-1901')).toBe(false)
    expect(isImpossibleDate('1893?')).toBe(false)
  })

  it('accepts a blank date', () => {
    expect(isImpossibleDate('')).toBe(false)
    expect(isImpossibleDate('   ')).toBe(false)
  })
})

// ── normalise — rejection rules ───────────────────────────────────────────

describe('createCardSource normalise', () => {
  it('rejects a row with a missing SHELFMARK', () => {
    const source = createCardSource([validRow({ SHELFMARK: '' })])
    const result = source.normalise(validRow({ SHELFMARK: '' }))

    expect(result.kind).toBe('rejected')
    if (result.kind === 'rejected') {
      expect(result.reason).toMatch(/SHELFMARK/i)
    }
  })

  it('rejects a row with a whitespace-only SHELFMARK', () => {
    const source = createCardSource([validRow({ SHELFMARK: '            ' })])
    const result = source.normalise(validRow({ SHELFMARK: '            ' }))

    expect(result.kind).toBe('rejected')
    if (result.kind === 'rejected') {
      expect(result.reason).toMatch(/SHELFMARK/i)
    }
  })

  it('rejects a row with an impossible DATE', () => {
    const row = validRow({ DATE: '18999       ' })
    const source = createCardSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('rejected')
    if (result.kind === 'rejected') {
      expect(result.reason).toMatch(/18999/)
      expect(result.reason).toMatch(/DATE/i)
    }
  })

  it('rejects a row with a blank TITLE', () => {
    const row = validRow({ TITLE: '' })
    const source = createCardSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('rejected')
    if (result.kind === 'rejected') {
      expect(result.reason).toMatch(/TITLE/i)
    }
  })

  it('accepts a row with a valid documentary date', () => {
    const row = validRow({ DATE: 'c.1893      ' })
    const source = createCardSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('normalised')
    if (result.kind === 'normalised') {
      expect(result.record.year).toBe(1893)
    }
  })

  it('accepts a row with a date range', () => {
    const row = validRow({ DATE: '1893-1901   ' })
    const source = createCardSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('normalised')
    if (result.kind === 'normalised') {
      expect(result.record.year).toBe(1893)
    }
  })

  it('accepts a row with a blank date and sets year to null', () => {
    const row = validRow({ DATE: '            ' })
    const source = createCardSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('normalised')
    if (result.kind === 'normalised') {
      expect(result.record.year).toBeNull()
    }
  })

  it('trims fixed-width padding from all string fields', () => {
    const row = validRow()
    const source = createCardSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('normalised')
    if (result.kind === 'normalised') {
      // dBase fields come padded; the adapter must trim them.
      expect(result.record.shelfmark).toBe('LH/0001')
      expect(result.record.surname).toBe('ATKINSON')
      expect(result.record.forenames).toBe('ALICE')
    }
  })
})

// ── Reconciliation invariant ──────────────────────────────────────────────

describe('pipeline reconciliation — rowsIn === rowsOut + rejected.length', () => {
  it('holds for a fully valid dataset', async () => {
    const rows = [validRow({ SHELFMARK: 'LH/0001' }), validRow({ SHELFMARK: 'LH/0002' })]
    const source = createCardSource(rows)
    const { report } = await runPipeline(source, 'test-source', '2024-01-01T00:00:00.000Z')

    expect(report.rowsIn).toBe(report.rowsOut + report.rejected.length)
    expect(report.status).toBe('lossless')
  })

  it('holds when all three broken row types are present', async () => {
    const rows: RawRow[] = [
      // Three valid rows
      validRow({ SHELFMARK: 'LH/0001' }),
      validRow({ SHELFMARK: 'LH/0002' }),
      validRow({ SHELFMARK: 'LH/0003' }),
      // Broken row 1: missing SHELFMARK
      validRow({ SHELFMARK: '' }),
      // Broken row 2: impossible DATE
      validRow({ SHELFMARK: 'ERR/0001', DATE: '18999       ' }),
      // Broken row 3: blank TITLE
      validRow({ SHELFMARK: 'ERR/0002', TITLE: '' }),
    ]

    const source = createCardSource(rows)
    const { report } = await runPipeline(source, 'test-source', '2024-01-01T00:00:00.000Z')

    expect(report.rowsIn).toBe(6)
    expect(report.rowsOut).toBe(3)
    expect(report.rejected).toHaveLength(3)
    expect(report.rowsIn).toBe(report.rowsOut + report.rejected.length)
    expect(report.status).toBe('lossless')
  })

  it('holds for an entirely broken dataset', async () => {
    const rows: RawRow[] = [
      validRow({ SHELFMARK: '' }),
      validRow({ SHELFMARK: 'ERR/0001', DATE: '18999       ' }),
      validRow({ SHELFMARK: 'ERR/0002', TITLE: '' }),
    ]

    const source = createCardSource(rows)
    const { report } = await runPipeline(source, 'test-source', '2024-01-01T00:00:00.000Z')

    expect(report.rowsOut).toBe(0)
    expect(report.rejected).toHaveLength(3)
    expect(report.rowsIn).toBe(report.rowsOut + report.rejected.length)
    expect(report.status).toBe('lossless')
  })

  it('holds for an empty dataset', async () => {
    const source = createCardSource([])
    const { report } = await runPipeline(source, 'test-source', '2024-01-01T00:00:00.000Z')

    expect(report.rowsIn).toBe(0)
    expect(report.rowsOut).toBe(0)
    expect(report.rejected).toHaveLength(0)
    expect(report.rowsIn).toBe(report.rowsOut + report.rejected.length)
    expect(report.status).toBe('lossless')
  })
})
