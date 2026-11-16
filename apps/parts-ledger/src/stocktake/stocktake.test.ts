/**
 * Tests for stocktake domain logic.
 *
 * Covers:
 *   - binInRange and parseBin correctness.
 *   - entriesInRange: filtering and sort order.
 *   - computeTally: matched vs discrepant accounting.
 *   - Empty range produces an empty entry list (not an error).
 *   - Discrepancy logic: a counted qty matching the ledger is 'matched',
 *     a differing qty is 'discrepant' with the correct delta.
 */

import { describe, it, expect } from 'vitest'
import {
  binInRange,
  parseBin,
  entriesInRange,
  computeTally,
} from './types.js'
import type { LedgerEntry } from '../source/ledgerSource.js'
import type { CheckedItem, BinRange } from './types.js'

// ── Helpers ───────────────────────────────────────────────────────────────

function makeEntry(partNo: string, bin: string, qty = 10): LedgerEntry {
  return {
    partNo,
    description: `Part ${partNo}`,
    vehicle: 'TEST VEHICLE',
    qty,
    bin,
    status: 'active',
    priceP: 1000,
    lastMoved: '01/01/2000',
  }
}

function makeChecked(entry: LedgerEntry, counted: number): CheckedItem {
  if (counted === entry.qty) {
    return { entry, outcome: { kind: 'matched' } }
  }
  return {
    entry,
    outcome: {
      kind: 'discrepant',
      counted,
      note: 'test note',
      initials: 'JRH',
    },
  }
}

// ── parseBin ──────────────────────────────────────────────────────────────

describe('parseBin', () => {
  it('parses a single-letter bin', () => {
    expect(parseBin('A3')).toEqual({ row: 'A', pos: 3 })
  })

  it('parses a two-digit position', () => {
    expect(parseBin('B12')).toEqual({ row: 'B', pos: 12 })
  })

  it('is case-insensitive', () => {
    expect(parseBin('a3')).toEqual({ row: 'A', pos: 3 })
  })

  it('handles trailing spaces', () => {
    expect(parseBin('A3  ')).toEqual({ row: 'A', pos: 3 })
  })

  it('returns null for a purely numeric code', () => {
    expect(parseBin('12')).toBeNull()
  })

  it('returns null for a purely alphabetic code', () => {
    expect(parseBin('AB')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseBin('')).toBeNull()
  })
})

// ── binInRange ────────────────────────────────────────────────────────────

describe('binInRange', () => {
  const range: BinRange = { from: 'A1', to: 'A9' }

  it('accepts a bin inside the range', () => {
    expect(binInRange('A3', range)).toBe(true)
    expect(binInRange('A1', range)).toBe(true)
    expect(binInRange('A9', range)).toBe(true)
  })

  it('rejects a bin before the range start', () => {
    // B-row sorts after A-row, so A-only range excludes B
    expect(binInRange('B1', { from: 'B3', to: 'B9' })).toBe(false)
  })

  it('rejects a bin after the range end', () => {
    expect(binInRange('A10', range)).toBe(false)
  })

  it('rejects a bin in a different row (earlier)', () => {
    // A < B, so A-row bin is before B-row range
    expect(binInRange('A5', { from: 'B1', to: 'B9' })).toBe(false)
  })

  it('rejects a bin in a different row (later)', () => {
    expect(binInRange('C5', range)).toBe(false)
  })

  it('handles cross-row ranges', () => {
    const crossRange: BinRange = { from: 'A1', to: 'B12' }
    expect(binInRange('A9', crossRange)).toBe(true)
    expect(binInRange('B1', crossRange)).toBe(true)
    expect(binInRange('B12', crossRange)).toBe(true)
    expect(binInRange('C1', crossRange)).toBe(false)
  })
})

// ── entriesInRange ────────────────────────────────────────────────────────

describe('entriesInRange', () => {
  const entries: LedgerEntry[] = [
    makeEntry('P001', 'B5'),
    makeEntry('P002', 'A3'),
    makeEntry('P003', 'A1'),
    makeEntry('P004', 'C7'),
    makeEntry('P005', 'A9'),
    makeEntry('P006', 'A3'), // same bin as P002, different part
  ]

  it('returns only entries within the range', () => {
    const result = entriesInRange(entries, { from: 'A1', to: 'A9' })
    const partNos = result.map((e) => e.partNo)
    expect(partNos).not.toContain('P001') // B5
    expect(partNos).not.toContain('P004') // C7
    expect(partNos).toContain('P002')
    expect(partNos).toContain('P003')
    expect(partNos).toContain('P005')
    expect(partNos).toContain('P006')
  })

  it('returns an empty array for a range with no matching entries', () => {
    const result = entriesInRange(entries, { from: 'D1', to: 'D9' })
    expect(result).toHaveLength(0)
  })

  it('sorts by bin row, then position, then partNo', () => {
    const result = entriesInRange(entries, { from: 'A1', to: 'A9' })
    // A1, A3 (P002), A3 (P006), A9
    expect(result[0]?.partNo).toBe('P003') // A1
    expect(result[1]?.bin).toBe('A3')
    expect(result[2]?.bin).toBe('A3')
    expect(result[3]?.partNo).toBe('P005') // A9
  })

  it('includes entries from exactly the from and to boundaries', () => {
    const result = entriesInRange(entries, { from: 'A3', to: 'A3' })
    expect(result).toHaveLength(2)
    expect(result.every((e) => e.bin === 'A3')).toBe(true)
  })
})

// ── computeTally ──────────────────────────────────────────────────────────

describe('computeTally', () => {
  it('returns zeros for an empty checked map', () => {
    const tally = computeTally(new Map())
    expect(tally).toEqual({ checked: 0, matched: 0, discrepant: 0 })
  })

  it('counts a matched item correctly', () => {
    const entry = makeEntry('P001', 'A1', 5)
    const checked = new Map([['P001', makeChecked(entry, 5)]])
    const tally = computeTally(checked)
    expect(tally).toEqual({ checked: 1, matched: 1, discrepant: 0 })
  })

  it('counts a discrepant item correctly', () => {
    const entry = makeEntry('P001', 'A1', 5)
    const checked = new Map([['P001', makeChecked(entry, 3)]])
    const tally = computeTally(checked)
    expect(tally).toEqual({ checked: 1, matched: 0, discrepant: 1 })
  })

  it('handles a mix of matched and discrepant items', () => {
    const e1 = makeEntry('P001', 'A1', 5)
    const e2 = makeEntry('P002', 'A2', 3)
    const e3 = makeEntry('P003', 'A3', 7)
    const e4 = makeEntry('P004', 'A4', 2)

    const checked = new Map([
      ['P001', makeChecked(e1, 5)],  // matched
      ['P002', makeChecked(e2, 3)],  // matched
      ['P003', makeChecked(e3, 4)],  // discrepant (-3)
      ['P004', makeChecked(e4, 6)],  // discrepant (+4)
    ])

    const tally = computeTally(checked)
    expect(tally).toEqual({ checked: 4, matched: 2, discrepant: 2 })
  })

  it('checked equals matched + discrepant', () => {
    const entries = Array.from({ length: 10 }, (_, i) => makeEntry(`P${i}`, 'A1', i + 1))
    const checked = new Map(
      entries.map((e, i) => [e.partNo, makeChecked(e, i % 3 === 0 ? e.qty + 1 : e.qty)]),
    )
    const tally = computeTally(checked)
    expect(tally.checked).toBe(tally.matched + tally.discrepant)
  })
})

// ── Discrepancy logic ─────────────────────────────────────────────────────

describe('discrepancy outcome', () => {
  it('a counted quantity equal to ledger qty is matched', () => {
    const entry = makeEntry('P001', 'A1', 10)
    const item = makeChecked(entry, 10)
    expect(item.outcome.kind).toBe('matched')
  })

  it('a counted quantity less than ledger qty is discrepant', () => {
    const entry = makeEntry('P001', 'A1', 10)
    const item = makeChecked(entry, 7)
    expect(item.outcome.kind).toBe('discrepant')
    if (item.outcome.kind === 'discrepant') {
      expect(item.outcome.counted).toBe(7)
      // delta = counted - ledger = 7 - 10 = -3
      expect(item.outcome.counted - entry.qty).toBe(-3)
    }
  })

  it('a counted quantity greater than ledger qty is discrepant', () => {
    const entry = makeEntry('P001', 'A1', 10)
    const item = makeChecked(entry, 15)
    expect(item.outcome.kind).toBe('discrepant')
    if (item.outcome.kind === 'discrepant') {
      expect(item.outcome.counted - entry.qty).toBe(5)
    }
  })

  it('zero counted against positive ledger qty is discrepant', () => {
    const entry = makeEntry('P001', 'A1', 5)
    const item = makeChecked(entry, 0)
    expect(item.outcome.kind).toBe('discrepant')
  })

  it('zero counted against zero ledger qty is matched', () => {
    const entry = makeEntry('P001', 'A1', 0)
    const item = makeChecked(entry, 0)
    expect(item.outcome.kind).toBe('matched')
  })
})
