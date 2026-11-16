/**
 * Tests for the Parts Ledger source adapter.
 *
 * Covers:
 *   - Rejection of the three deliberately broken row types.
 *   - Reconciliation invariant: rowsIn === rowsOut + rejected.length.
 *   - parseQty, parsePriceP, parseStatus helpers.
 */

import { describe, it, expect } from 'vitest'
import {
  createLedgerSource,
  parseQty,
  parsePriceP,
  parseStatus,
} from './ledgerSource.js'
import { runPipeline } from '@reliquary/kit/import'
import type { RawRow } from '@reliquary/kit/contract'

// ── Helpers ───────────────────────────────────────────────────────────────

/** A minimal valid raw row (space-padded like a dot-matrix printout). */
function validRow(overrides: Partial<Record<string, string>> = {}): RawRow {
  return {
    PART_NO:     'BRK00001    ',
    DESCRIPTION: 'FRONT BRAKE PAD SET                     ',
    VEHICLE:     'FORD FOCUS 1.6                      ',
    QTY:         '4     ',
    BIN:         'A3  ',
    STATUS:      'A ',
    PRICE_P:     '3200    ',
    LAST_MOVED:  '12/06/1999  ',
    ...overrides,
  }
}

// ── parseQty ──────────────────────────────────────────────────────────────

describe('parseQty', () => {
  it('parses a plain integer string', () => {
    expect(parseQty('4')).toBe(4)
  })

  it('parses a space-padded integer', () => {
    expect(parseQty('4     ')).toBe(4)
  })

  it('parses zero', () => {
    expect(parseQty('0')).toBe(0)
  })

  it('returns null for "n/a"', () => {
    expect(parseQty('n/a')).toBeNull()
  })

  it('returns null for a blank value', () => {
    expect(parseQty('')).toBeNull()
    expect(parseQty('   ')).toBeNull()
  })

  it('returns null for a decimal value', () => {
    expect(parseQty('4.5')).toBeNull()
  })

  it('returns null for mixed text', () => {
    expect(parseQty('4 boxes')).toBeNull()
  })
})

// ── parsePriceP ───────────────────────────────────────────────────────────

describe('parsePriceP', () => {
  it('parses an integer pence value', () => {
    expect(parsePriceP('3200')).toBe(3200)
  })

  it('parses a padded price', () => {
    expect(parsePriceP('3200    ')).toBe(3200)
  })

  it('returns null for a blank price', () => {
    expect(parsePriceP('')).toBeNull()
    expect(parsePriceP('   ')).toBeNull()
  })
})

// ── parseStatus ───────────────────────────────────────────────────────────

describe('parseStatus', () => {
  it('maps "A" to "active"', () => {
    expect(parseStatus('A')).toBe('active')
    expect(parseStatus('A ')).toBe('active')
  })

  it('maps "D" to "discontinued"', () => {
    expect(parseStatus('D')).toBe('discontinued')
    expect(parseStatus('D ')).toBe('discontinued')
  })

  it('returns null for unknown letters', () => {
    expect(parseStatus('Z')).toBeNull()
    expect(parseStatus('X')).toBeNull()
    expect(parseStatus('')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(parseStatus('a')).toBe('active')
    expect(parseStatus('d')).toBe('discontinued')
  })
})

// ── normalise — rejection rules ───────────────────────────────────────────

describe('createLedgerSource normalise', () => {
  it('rejects a row with non-numeric QTY ("n/a")', () => {
    const row = validRow({ QTY: 'n/a   ' })
    const source = createLedgerSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('rejected')
    if (result.kind === 'rejected') {
      expect(result.reason).toMatch(/QTY/i)
      expect(result.reason).toMatch(/n\/a/)
    }
  })

  it('rejects a row with a missing BIN', () => {
    const row = validRow({ BIN: '' })
    const source = createLedgerSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('rejected')
    if (result.kind === 'rejected') {
      expect(result.reason).toMatch(/BIN/i)
    }
  })

  it('rejects a row with an unknown STATUS letter ("Z")', () => {
    const row = validRow({ STATUS: 'Z ' })
    const source = createLedgerSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('rejected')
    if (result.kind === 'rejected') {
      expect(result.reason).toMatch(/STATUS/i)
      expect(result.reason).toMatch(/Z/)
    }
  })

  it('accepts a valid active row and trims padding', () => {
    const row = validRow()
    const source = createLedgerSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('normalised')
    if (result.kind === 'normalised') {
      expect(result.record.partNo).toBe('BRK00001')
      expect(result.record.description).toBe('FRONT BRAKE PAD SET')
      expect(result.record.qty).toBe(4)
      expect(result.record.bin).toBe('A3')
      expect(result.record.status).toBe('active')
      expect(result.record.priceP).toBe(3200)
      expect(result.record.lastMoved).toBe('12/06/1999')
    }
  })

  it('accepts a discontinued row', () => {
    const row = validRow({ STATUS: 'D ' })
    const source = createLedgerSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('normalised')
    if (result.kind === 'normalised') {
      expect(result.record.status).toBe('discontinued')
    }
  })

  it('sets priceP to null for a blank PRICE_P', () => {
    const row = validRow({ PRICE_P: '        ' })
    const source = createLedgerSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('normalised')
    if (result.kind === 'normalised') {
      expect(result.record.priceP).toBeNull()
    }
  })

  it('sets lastMoved to null for a blank LAST_MOVED', () => {
    const row = validRow({ LAST_MOVED: '            ' })
    const source = createLedgerSource([row])
    const result = source.normalise(row)

    expect(result.kind).toBe('normalised')
    if (result.kind === 'normalised') {
      expect(result.record.lastMoved).toBeNull()
    }
  })
})

// ── Reconciliation invariant ──────────────────────────────────────────────

describe('pipeline reconciliation — rowsIn === rowsOut + rejected.length', () => {
  it('holds for a fully valid dataset', async () => {
    const rows = [
      validRow({ PART_NO: 'BRK00001    ' }),
      validRow({ PART_NO: 'BRK00002    ' }),
    ]
    const source = createLedgerSource(rows)
    const { report } = await runPipeline(source, 'test-ledger', '2024-01-01T00:00:00.000Z')

    expect(report.rowsIn).toBe(report.rowsOut + report.rejected.length)
    expect(report.status).toBe('lossless')
  })

  it('holds when all three broken row types are present', async () => {
    const rows: RawRow[] = [
      // Three valid rows
      validRow({ PART_NO: 'BRK00001    ' }),
      validRow({ PART_NO: 'BRK00002    ' }),
      validRow({ PART_NO: 'BRK00003    ' }),
      // Broken row 1: non-numeric QTY
      validRow({ PART_NO: 'ERR00001    ', QTY: 'n/a   ' }),
      // Broken row 2: missing BIN
      validRow({ PART_NO: 'ERR00002    ', BIN: '' }),
      // Broken row 3: unknown STATUS
      validRow({ PART_NO: 'ERR00003    ', STATUS: 'Z ' }),
    ]

    const source = createLedgerSource(rows)
    const { report } = await runPipeline(source, 'test-ledger', '2024-01-01T00:00:00.000Z')

    expect(report.rowsIn).toBe(6)
    expect(report.rowsOut).toBe(3)
    expect(report.rejected).toHaveLength(3)
    expect(report.rowsIn).toBe(report.rowsOut + report.rejected.length)
    expect(report.status).toBe('lossless')
  })

  it('holds for an entirely broken dataset', async () => {
    const rows: RawRow[] = [
      validRow({ PART_NO: 'ERR00001    ', QTY: 'n/a   ' }),
      validRow({ PART_NO: 'ERR00002    ', BIN: '' }),
      validRow({ PART_NO: 'ERR00003    ', STATUS: 'Z ' }),
    ]

    const source = createLedgerSource(rows)
    const { report } = await runPipeline(source, 'test-ledger', '2024-01-01T00:00:00.000Z')

    expect(report.rowsOut).toBe(0)
    expect(report.rejected).toHaveLength(3)
    expect(report.rowsIn).toBe(report.rowsOut + report.rejected.length)
    expect(report.status).toBe('lossless')
  })

  it('holds for an empty dataset', async () => {
    const source = createLedgerSource([])
    const { report } = await runPipeline(source, 'test-ledger', '2024-01-01T00:00:00.000Z')

    expect(report.rowsIn).toBe(0)
    expect(report.rowsOut).toBe(0)
    expect(report.rejected).toHaveLength(0)
    expect(report.rowsIn).toBe(report.rowsOut + report.rejected.length)
    expect(report.status).toBe('lossless')
  })

  it('rejected rows include human-readable sourceRefs', async () => {
    const rows: RawRow[] = [
      validRow({ PART_NO: 'ERR00001    ', QTY: 'n/a   ' }),
      validRow({ PART_NO: 'ERR00002    ', BIN: '' }),
      validRow({ PART_NO: 'ERR00003    ', STATUS: 'Z ' }),
    ]

    const source = createLedgerSource(rows)
    const { report } = await runPipeline(source, 'test-ledger', '2024-01-01T00:00:00.000Z')

    // Each rejected row's sourceRef must mention the part number.
    for (const r of report.rejected) {
      expect(r.sourceRef).toMatch(/ERR0000[123]/)
    }
  })
})
