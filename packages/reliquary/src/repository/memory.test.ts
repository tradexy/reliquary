/**
 * Unit tests for the in-memory Repository.
 *
 * Covers: all(), byId(), search() — including normalisation edge cases,
 * multi-word AND semantics, empty query passthrough, and report().
 */

import { describe, it, expect } from 'vitest'
import { createRepository } from './memory.js'
import { buildReport } from '../import/report.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

interface Widget {
  id: string
  name: string
  category: string
}

const WIDGETS: Widget[] = [
  { id: 'W-001', name: 'Copper Gear', category: 'Mechanical' },
  { id: 'W-002', name: 'Bone Clasp', category: 'Fastener' },
  { id: 'W-003', name: 'Amber Lens', category: 'Optical' },
  { id: 'W-004', name: 'Dust Filter', category: 'Mechanical' },
]

const REPORT = buildReport({
  sourceName: 'widget-store',
  importedAt: '2024-01-01T00:00:00.000Z',
  rowsIn: 4,
  rowsOut: 4,
  rejected: [],
  fieldMappings: [{ sourceField: 'ID', normalisedField: 'id' }],
  unmappedFields: [],
  synthesisedFields: [],
})

function makeRepo() {
  return createRepository<Widget>(WIDGETS, REPORT, 'id', ['name', 'category'])
}

// ── all() ─────────────────────────────────────────────────────────────────────

describe('all()', () => {
  it('returns all records', () => {
    expect(makeRepo().all()).toHaveLength(4)
  })

  it('returns a stable reference', () => {
    const repo = makeRepo()
    expect(repo.all()).toBe(repo.all())
  })

  it('is frozen — callers cannot mutate the store', () => {
    const repo = makeRepo()
    expect(() => {
      // Cast away readonly to verify the runtime freeze throws.
      ;(repo.all() as Widget[]).push({ id: 'X', name: 'X', category: 'X' })
    }).toThrow()
  })
})

// ── byId() ────────────────────────────────────────────────────────────────────

describe('byId()', () => {
  it('finds a record by its id', () => {
    expect(makeRepo().byId('W-002')?.name).toBe('Bone Clasp')
  })

  it('returns undefined for an unknown id', () => {
    expect(makeRepo().byId('Z-999')).toBeUndefined()
  })

  it('is case-sensitive (ids are exact keys)', () => {
    expect(makeRepo().byId('w-001')).toBeUndefined()
    expect(makeRepo().byId('W-001')).toBeDefined()
  })
})

// ── search() ──────────────────────────────────────────────────────────────────

describe('search()', () => {
  it('returns all records for an empty string', () => {
    expect(makeRepo().search('')).toHaveLength(4)
  })

  it('returns all records for a whitespace-only query', () => {
    expect(makeRepo().search('   ')).toHaveLength(4)
  })

  it('matches a single keyword case-insensitively', () => {
    const results = makeRepo().search('mechanical')
    expect(results).toHaveLength(2)
    expect(results.map((w) => w.id).sort()).toEqual(['W-001', 'W-004'])
  })

  it('matches across the name field', () => {
    const results = makeRepo().search('lens')
    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe('W-003')
  })

  it('is case-insensitive on query side', () => {
    expect(makeRepo().search('BONE')).toHaveLength(1)
    expect(makeRepo().search('bone')).toHaveLength(1)
  })

  it('applies AND semantics for multi-word queries', () => {
    // Both tokens must appear in a single record's haystack.
    const both = makeRepo().search('copper mechanical')
    expect(both).toHaveLength(1)
    expect(both[0]?.id).toBe('W-001')
  })

  it('returns empty array when no record matches', () => {
    expect(makeRepo().search('nonexistent')).toHaveLength(0)
  })

  it('does not search fields excluded from searchFields', () => {
    // 'id' is not in searchFields — a search on a raw id prefix should miss.
    const repo = createRepository<Widget>(WIDGETS, REPORT, 'id', ['name'])
    // 'W-002' is an id value, not in the name field
    expect(repo.search('W-002')).toHaveLength(0)
  })

  it('returns original (unmodified) records', () => {
    const results = makeRepo().search('amber')
    expect(results[0]).toEqual({ id: 'W-003', name: 'Amber Lens', category: 'Optical' })
  })
})

// ── report() ──────────────────────────────────────────────────────────────────

describe('report()', () => {
  it('returns the report supplied at construction', () => {
    expect(makeRepo().report()).toBe(REPORT)
  })

  it('report status reflects reconciliation', () => {
    expect(makeRepo().report().status).toBe('lossless')
  })
})

// ── empty source ──────────────────────────────────────────────────────────────

describe('empty source', () => {
  const emptyReport = buildReport({
    sourceName: 'empty',
    importedAt: '2024-01-01T00:00:00.000Z',
    rowsIn: 0,
    rowsOut: 0,
    rejected: [],
    fieldMappings: [],
    unmappedFields: [],
    synthesisedFields: [],
  })

  it('all() returns an empty array', () => {
    const repo = createRepository<Widget>([], emptyReport, 'id', ['name'])
    expect(repo.all()).toHaveLength(0)
  })

  it('search() returns an empty array', () => {
    const repo = createRepository<Widget>([], emptyReport, 'id', ['name'])
    expect(repo.search('')).toHaveLength(0)
    expect(repo.search('anything')).toHaveLength(0)
  })
})
